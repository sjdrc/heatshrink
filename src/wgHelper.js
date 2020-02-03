const dataManager = require("./dataManager");
const child_process = require("child_process");

exports.checkServerKeys = (state, cb) => {
	if (!state.server_config.private_key || !state.server_config.public_key) {
		child_process.exec("wg genkey", (err, stdout, stderr) => {
			if (err || stderr) {
				console.error(err);
				console.error("Wireguard is possibly not installed?");
				process.exit(1);
			}

			const private_key = stdout.replace(/\n/, "");

			const wgchild = child_process.spawn("wg", ["pubkey"]);

			let pubkey;
			wgchild.stdout.on("data", data => {
				pubkey = data.toString();
			});

			wgchild.stderr.on("data", data => {
				console.log(data.toString());
			});

			wgchild.on("close", code => {
				if (code !== 0) {
					console.error(`wg pubkey process exited with code ${code}`);
					process.exit(1);
				}

				const public_key = pubkey.replace(/\n/, "");

				state.server_config.public_key = public_key;
				state.server_config.private_key = private_key;

				dataManager.saveServerConfig(state.server_config, err => {
					if (err) {
						console.error("could not save private and public keys");
						process.exit(1);
						return;
					}

					cb(state);
				});
				// do stuff
			});

			wgchild.stdin.end(private_key);
		});
	} else {
		cb(state);
	}
};

exports.generateKeyPair = cb => {
	child_process.exec("wg genkey", (err, stdout, stderr) => {
		if (err || stderr) {
			cb(err);
			return;
		}

		const private_key = stdout.replace(/\n/, "");

		child_process.exec(
			`echo "${private_key}" | wg pubkey`,
			(err, stdout, stderr) => {
				if (err || stderr) {
					cb(err);
					return;
				}

				const public_key = stdout.replace(/\n/, "");

				cb(null, {
					private_key: private_key,
					public_key: public_key,
				});
			}
		);
	});
};

exports.stopWireguard = (wg_iface, cb) => {
	child_process.exec(`systemctl stop wg-quick@${wg_iface}`, (err, stdout, stderr) => {
		if (err || stderr) {
			cb(err);
			return;
		}

		cb();
	});
};

exports.startWireguard = (wg_iface, cb) => {
	child_process.exec(
		`systemctl start wg-quick@${wg_iface}`,
		(err, stdout, stderr) => {
			if (err || stderr) {
				cb(err);
				return;
			}

			cb();
		}
	);
};

exports.wireguardStatus = (wg_iface, cb) => {
	child_process.exec(
		`journalctl -u wg-quick@${wg_iface}.service -n 100`,
		(err, stdout, stderr) => {
			if (err || stderr) {
				cb(err);
				return;
			}

			cb(null, stdout);
		}
	);
};

exports.getNetworkAdapter = cb => {
	child_process.exec(
		`ip route | grep default | awk '{print $5}'`,
		(err, stdout, stderr) => {
			if (err || stderr) {
				cb(err);
				return;
			}

			cb(null, stdout.replace(/\n/, ""));
		}
	);
};

exports.getNetworkIP = cb => {
	child_process.exec(
		`ip addr show $(ip route | grep default | awk '{print $5}') | grep -m1 'inet ' | awk '{print $2}' | cut -d'/' -f1`,
		(err, stdout, stderr) => {
			if (err || stderr) {
				cb(err);
				return;
			}

			cb(null, stdout.replace(/\n/, ""));
		}
	);
};

exports.addPeer = (wg_iface, peer, cb) => {
	child_process.exec(
		`wg set ${wg_iface} peer ${peer.public_key} allowed-ips ${peer.allowed_ips}/32`,
		(err, stdout, stderr) => {
			if (err || stderr) {
				cb(err);
				return;
			}

			cb(null);
		}
	);
};

exports.deletePeer = (wg_iface, peer, cb) => {
	child_process.exec(
		`wg set ${wg_iface} peer ${peer.public_key} remove`,
		(err, stdout, stderr) => {
			if (err || stderr) {
				cb(err);
				return;
			}

			cb(null);
		}
	);
};

exports.enableUFW = (port, cb) => {
	child_process.exec(`ufw allow ${port}`, (err, stdout, stderr) => {
		if (err || stderr) {
			cb(err);
			return;
		}

		cb(null);
	});
};

exports.disableUFW = (port, cb) => {
	child_process.exec(`ufw delete allow ${port}`, (err, stdout, stderr) => {
		if (err || stderr) {
			cb(err);
			return;
		}

		cb(null);
	});
};
