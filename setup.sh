#!/bin/bash -e
if [[ "$EUID" -ne 0 ]]; then echo "You must run this script as root"; exit 1; fi

install_wireguard()
{
	sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys E1B39B6EF6DDB96564797591AE33835F504A1A25
	echo "deb http://ppa.launchpad.net/wireguard/wireguard/ubuntu $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/wireguard.list
	sudo apt update && sudo apt install --yes wireguard "linux-headers-$(uname -r)"
	echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
	sudo sysctl -p
	sudo ufw allow 58210
}

install_nodejs()
{
	curl https://deb.nodesource.com/setup_10.x | bash
	apt-get install -y nodejs
}

install_wireguard
install_nodejs
npm i --production --unsafe-perm
