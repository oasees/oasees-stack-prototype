package main

import (
	"context"
	"fmt"
	"net"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"google.golang.org/grpc"
	pluginapi "k8s.io/kubelet/pkg/apis/deviceplugin/v1beta1"
)

type DevicePlugin struct {
	resourceName string
	socket       string
	devices      map[string]*pluginapi.Device
	deviceSpecs  []*pluginapi.DeviceSpec
	server       *grpc.Server
	health       chan string
	stop         chan struct{}
	update       chan []string
	mutex        sync.Mutex
}

func NewDevicePlugin(resourceName, hostPathPrefix string, devices []string) *DevicePlugin {
	deviceSpecs := make([]*pluginapi.DeviceSpec, 0, len(devices))
	for _, dev := range devices {
		deviceSpecs = append(deviceSpecs, &pluginapi.DeviceSpec{
			HostPath:      hostPathPrefix + dev,
			ContainerPath: hostPathPrefix + dev,
			Permissions:   "rw",
		})
	}

	return &DevicePlugin{
		resourceName: resourceName,
		socket:       filepath.Join(pluginapi.DevicePluginPath, fmt.Sprintf("%s.sock", sanitizeName(resourceName))),
		deviceSpecs:  deviceSpecs,
		devices:      make(map[string]*pluginapi.Device),
		health:       make(chan string),
		stop:         make(chan struct{}),
		update:       make(chan []string),
	}
}

func (dp *DevicePlugin) Start() error {
	if err := dp.cleanup(); err != nil {
		return err
	}

	sock, err := net.Listen("unix", dp.socket)
	if err != nil {
		return err
	}

	dp.server = grpc.NewServer([]grpc.ServerOption{}...)
	pluginapi.RegisterDevicePluginServer(dp.server, dp)

	go dp.server.Serve(sock)

	// Wait for server to start
	conn, err := dp.dial(dp.socket, 5*time.Second)
	if err != nil {
		return err
	}
	conn.Close()

	go dp.healthCheck()
	go dp.handleUpdates()

	return dp.Register()
}

func (dp *DevicePlugin) Stop() error {
	if dp.server == nil {
		return nil
	}

	close(dp.stop)
	dp.server.Stop()
	dp.server = nil

	return dp.cleanup()
}

func (dp *DevicePlugin) Register() error {
	conn, err := dp.dial(pluginapi.KubeletSocket, 5*time.Second)
	if err != nil {
		return err
	}
	defer conn.Close()

	client := pluginapi.NewRegistrationClient(conn)
	req := &pluginapi.RegisterRequest{
		Version:      pluginapi.Version,
		Endpoint:     path.Base(dp.socket),
		ResourceName: dp.resourceName,
	}

	_, err = client.Register(context.Background(), req)
	return err
}

func (dp *DevicePlugin) ListAndWatch(empty *pluginapi.Empty, stream pluginapi.DevicePlugin_ListAndWatchServer) error {
	dp.mutex.Lock()
	devices := make([]*pluginapi.Device, 0, len(dp.devices))
	for _, d := range dp.devices {
		devices = append(devices, d)
	}
	dp.mutex.Unlock()

	if err := stream.Send(&pluginapi.ListAndWatchResponse{Devices: devices}); err != nil {
		return err
	}

	for {
		select {
		case <-dp.stop:
			return nil
		case updatedDevices := <-dp.update:
			// Fixed: Changed dp.updateDevices to dp.UpdateDevices (capital U)
			dp.UpdateDevices(updatedDevices)
			dp.mutex.Lock()
			devices := make([]*pluginapi.Device, 0, len(dp.devices))
			for _, d := range dp.devices {
				devices = append(devices, d)
			}
			dp.mutex.Unlock()

			if err := stream.Send(&pluginapi.ListAndWatchResponse{Devices: devices}); err != nil {
				return err
			}
		case id := <-dp.health:
			dp.mutex.Lock()
			if dev, exists := dp.devices[id]; exists {
				dev.Health = pluginapi.Unhealthy
			}
			dp.mutex.Unlock()

			if err := stream.Send(&pluginapi.ListAndWatchResponse{Devices: devices}); err != nil {
				return err
			}
		}
	}
}

func (dp *DevicePlugin) Allocate(ctx context.Context, reqs *pluginapi.AllocateRequest) (*pluginapi.AllocateResponse, error) {
	response := &pluginapi.AllocateResponse{}
	for range reqs.ContainerRequests {
		response.ContainerResponses = append(response.ContainerResponses, &pluginapi.ContainerAllocateResponse{
			Devices: dp.deviceSpecs,
		})
	}
	return response, nil
}

func (dp *DevicePlugin) PreStartContainer(context.Context, *pluginapi.PreStartContainerRequest) (*pluginapi.PreStartContainerResponse, error) {
	return &pluginapi.PreStartContainerResponse{}, nil
}

func (dp *DevicePlugin) GetDevicePluginOptions(context.Context, *pluginapi.Empty) (*pluginapi.DevicePluginOptions, error) {
	return &pluginapi.DevicePluginOptions{}, nil
}

func (dp *DevicePlugin) GetPreferredAllocation(context.Context, *pluginapi.PreferredAllocationRequest) (*pluginapi.PreferredAllocationResponse, error) {
	return &pluginapi.PreferredAllocationResponse{}, nil
}

func (dp *DevicePlugin) cleanup() error {
	if err := os.Remove(dp.socket); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (dp *DevicePlugin) dial(unixSocketPath string, timeout time.Duration) (*grpc.ClientConn, error) {
	return grpc.Dial(unixSocketPath,
		grpc.WithInsecure(),
		grpc.WithBlock(),
		grpc.WithTimeout(timeout),
		grpc.WithDialer(func(addr string, timeout time.Duration) (net.Conn, error) {
			return net.DialTimeout("unix", addr, timeout)
		}),
	)
}

func (dp *DevicePlugin) healthCheck() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-dp.stop:
			return
		case <-ticker.C:
			dp.mutex.Lock()
			for id := range dp.devices {
				if _, err := os.Stat(dp.deviceSpecs[0].HostPath); os.IsNotExist(err) {
					dp.health <- id
				}
			}
			dp.mutex.Unlock()
		}
	}
}

func (dp *DevicePlugin) handleUpdates() {
	for {
		select {
		case <-dp.stop:
			return
		case devices := <-dp.update:
			// Fixed: Changed from dp.update <- devices (which caused an infinite loop)
			// to directly updating the devices
			dp.UpdateDevices(devices)
		}
	}
}

func (dp *DevicePlugin) UpdateDevices(deviceNames []string) {
	devices := make(map[string]*pluginapi.Device)
	for _, name := range deviceNames {
		devices[name] = &pluginapi.Device{
			ID:     name,
			Health: pluginapi.Healthy,
		}
	}

	dp.mutex.Lock()
	dp.devices = devices
	dp.mutex.Unlock()

	// Only signal update channel if this isn't called from the handleUpdates method
	// to avoid potential deadlocks
	select {
	case dp.update <- deviceNames:
		// Update sent successfully
	default:
		// Channel is full or nobody is listening, that's ok
	}
}

func sanitizeName(name string) string {
	return strings.ReplaceAll(name, "/", "-")
}
