package main

import (
	"fmt"
	"os"
	"regexp"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/golang/glog"
)

type DevicePluginManager struct {
	configs   []DevicePluginConfig
	plugins   map[string]*DevicePlugin
	watcher   *fsnotify.Watcher
	stop      chan struct{}
	scanMutex sync.Mutex
}

type DevicePluginConfig struct {
	DevicePattern  string
	MaxDevices     int
	HostPathPrefix string
}

func NewDevicePluginManager(configs []DevicePluginConfig) *DevicePluginManager {
	return &DevicePluginManager{
		configs: configs,
		plugins: make(map[string]*DevicePlugin),
		stop:    make(chan struct{}),
	}
}

func (m *DevicePluginManager) Start() error {
	// Initial scan
	if err := m.scanDevices(); err != nil {
		return err
	}

	// Start device watcher
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return fmt.Errorf("failed to create watcher: %v", err)
	}
	m.watcher = watcher

	if err := watcher.Add("/dev"); err != nil {
		return fmt.Errorf("failed to watch /dev: %v", err)
	}

	go m.watchDevices()
	return nil
}

func (m *DevicePluginManager) Stop() {
	close(m.stop)
	if m.watcher != nil {
		m.watcher.Close()
	}
	for _, plugin := range m.plugins {
		plugin.Stop()
	}
}

func (m *DevicePluginManager) watchDevices() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-m.stop:
			return
		case event := <-m.watcher.Events:
			if event.Op&fsnotify.Create == fsnotify.Create || event.Op&fsnotify.Remove == fsnotify.Remove {
				glog.V(2).Infof("Device change detected: %s", event)
				m.scanDevices()
			}
		case err := <-m.watcher.Errors:
			glog.Errorf("Watcher error: %v", err)
		case <-ticker.C:
			m.scanDevices()
		}
	}
}

func (m *DevicePluginManager) scanDevices() error {
	m.scanMutex.Lock()
	defer m.scanMutex.Unlock()

	// Read all devices in /dev
	files, err := os.ReadDir("/dev")
	if err != nil {
		return fmt.Errorf("failed to read /dev: %v", err)
	}

	// Track current devices to detect removals
	currentDevices := make(map[string]bool)

	// Process each configuration
	for _, config := range m.configs {
		// Match devices against pattern
		re := regexp.MustCompile(config.DevicePattern)

		var deviceCount int
		for _, file := range files {
			fileName := file.Name()
			if re.MatchString(fileName) {
				// Create a unique resource name for this specific device
				resourceName := fmt.Sprintf("oasees.dev/%s", fileName)

				// Mark this device as currently present
				currentDevices[resourceName] = true

				if plugin, exists := m.plugins[resourceName]; exists {
					// Device plugin already exists, ensure it's updated
					plugin.UpdateDevices([]string{fileName})
					glog.V(3).Infof("Updated device plugin for %s", resourceName)
				} else {
					// Create a new device plugin for this device
					glog.V(2).Infof("Creating new device plugin for %s", resourceName)
					plugin := NewDevicePlugin(resourceName, config.HostPathPrefix, []string{fileName})
					if err := plugin.Start(); err != nil {
						glog.Errorf("Failed to start plugin %s: %v", resourceName, err)
						continue
					}
					m.plugins[resourceName] = plugin
				}

				deviceCount++
				if deviceCount >= config.MaxDevices {
					break
				}
			}
		}
	}

	// Stop and remove plugins for devices that no longer exist
	for resourceName, plugin := range m.plugins {
		if !currentDevices[resourceName] {
			glog.V(2).Infof("Stopping device plugin for removed device: %s", resourceName)
			plugin.Stop()
			delete(m.plugins, resourceName)
		}
	}

	return nil
}
