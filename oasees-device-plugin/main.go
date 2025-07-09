package main

import (
	"flag"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/golang/glog"
)

func main() {
	defer glog.Flush()
	flag.Parse()

	configs := []DevicePluginConfig{
		{
			DevicePattern:  "^snd$",
			MaxDevices:     1,
			HostPathPrefix: "/dev/",
		},
		{
			DevicePattern:  "^ttyUSB[0-4]+$",
			MaxDevices:     5,
			HostPathPrefix: "/dev/",
		},
		{
			DevicePattern:  "^ttyACM[0-4]+$",
			MaxDevices:     5,
			HostPathPrefix: "/dev/",
		},
		{
			DevicePattern:  "^video[0-4]+$",
			MaxDevices:     5,
			HostPathPrefix: "/dev/",
		},
	}

	manager := NewDevicePluginManager(configs)
	if err := manager.Start(); err != nil {
		glog.Fatalf("Failed to start device plugin manager: %v", err)
	}
	defer manager.Stop()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM, syscall.SIGHUP)

	for {
		select {
		case sig := <-sigChan:
			glog.Infof("Received signal %v, shutting down", sig)
			return
		case <-time.After(5 * time.Second):
			// Periodic health check/log
			glog.V(3).Info("Device plugin running")
		}
	}
}
