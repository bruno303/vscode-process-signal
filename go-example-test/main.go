package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	run := true

	exitC := make(chan os.Signal, 1)
	signal.Notify(exitC, syscall.SIGINT, syscall.SIGTERM, syscall.SIGHUP, syscall.SIGQUIT)

	go func() {
		sig := <-exitC
		fmt.Printf("Received signal %v. Shutting down...\n", sig)
		time.Sleep(5 * time.Second)
		run = false
	}()

	fmt.Println("Application running")
	for run {
		// simulate api, worker, etc
	}
}
