#!/bin/bash
# Increase kernel limits for high-concurrency Socket.io server
sysctl -w net.core.somaxconn=65535
sysctl -w net.ipv4.tcp_max_syn_backlog=65535
sysctl -w net.ipv4.tcp_tw_reuse=1
sysctl -w net.ipv4.ip_local_port_range="1024 65535"
echo "✅ Kernel limits updated!"
echo "net.core.somaxconn=$(cat /proc/sys/net/core/somaxconn)"
echo "net.ipv4.tcp_max_syn_backlog=$(cat /proc/sys/net/ipv4/tcp_max_syn_backlog)"
