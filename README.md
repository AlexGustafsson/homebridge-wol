<p align="center">
  <img src=".github/banner.png">
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/homebridge-wol">
      <img src="https://flat.badgen.net/npm/v/homebridge-wol" alt="NPM Version">
  </a>
  <a href="https://www.npmjs.com/package/homebridge-wol">
      <img src="https://flat.badgen.net/npm/dt/homebridge-wol" alt="Total NPM Downloads">
  </a>
  <br>
  <strong><a href="#quickstart">Quick Start</a> | <a href="#contribute">Contribute</a> </strong>
</p>

# A Wake on Lan plugin for Homebridge
### Turn your PCs, laptops, servers and more on and off through Siri

> Hi! Are you willing to help? This project is looking for contributors. PRs are more than welcome.

> Unsure of where to start? Read through open issues and try to solve them or open a new issue to start a conversation.

<a id="quickstart"></a>
## Quick Start

To install the plugin, head over to the machine with Homebridge set up and run the following command:
```
npm install -g homebridge-wol
```

Add your devices to your `config.json`:
```json
"accessories": [
  {
    "accessory": "NetworkDevice",
    "name": "My MacBook",
    "ip": "192.168.1.51",
    "mac": "aa:bb:cc:dd:ee:ff"
  }
]
```

## Table of contents

[Quickstart](#quickstart)<br/>
[Configuration](#configuration)<br />
[Lifecycle](#lifecycle)<br />
[Notes and FAQ](#faq)<br />
[Contributing](#contributing)

<a id="configuration"></a>
## Configuration

To make Homebridge aware of the new plugin, you will have to add it to your configuration usually found in `/root/.homebridge/config.json` or `/home/username/.homebridge/config.json`. If the file does not exist, you can create it following the [config sample](https://github.com/nfarina/homebridge/blob/master/config-sample.json). Somewhere inside that file you should see a key named `accessories`. This is where you can add your computer as shown here:

 ```json
"accessories": [
    {
      "accessory": "NetworkDevice",
      "name": "My Macbook",
      "mac": "<mac-address>",
      "ip": "192.168.1.51",
      "pingInterval": 45,
      "wakeGraceTime": 10,
      "wakeCommand": "ssh 192.168.1.51 caffeinate -u -t 300",
      "shutdownGraceTime": 15,
      "shutdownCommand": "ssh 192.168.1.51 sudo shutdown -h now"
    },
    {
      "accessory": "NetworkDevice",
      "name": "My Windows Gaming Rig",
      "mac": "<mac-address>",
      "ip": "192.168.1.151",
      "shutdownCommand": "net rpc shutdown --ipaddress 192.168.1.151 --user username%password"
    },
    {
      "accessory": "NetworkDevice",
      "name": "Raspberry Pi",
      "mac": "<mac-address>",
      "ip": "192.168.1.251",
      "pingInterval": 45,
      "wakeGraceTime": 90,
      "shutdownGraceTime": 15,
      "shutdownCommand": "sshpass -p 'raspberry' ssh -oStrictHostKeyChecking=no pi@192.168.1.251 sudo shutdown -h now"
    },
    {
      "accessory": "NetworkDevice",
      "name": "My NAS",
      "ip": "192.168.1.148",
      "log": false,
      "broadcastAddress": "172.16.1.255"
    }
]
```

### Required configuration

| Key | Description |
| --- | ------------|
| accessory | The type of accessory - has to be "NetworkDevice" |
| name | The name of the device - used in HomeKit apps as well as Siri, default `My NetworkDevice` |

### Optional configuration

#### Pinging

| Key | Description |
| --- | ------------|
| ip | The IPv4 address of the device - used to check current status by pinging the device |
| pingInterval | Ping interval in seconds, only used if `ip` is set, default `2` |
| pingsToChange | The number of pings necessary to trigger a state change, only used if `ip` is set, default `5` |
| pingTimeout | Number of seconds to wait for pinging to finish, default `1` |
| pingCommand | Command to run in order to know if a host is up or not. If the command exits successfully (zero as the exit code) the host is considered up. If an error is thrown or the command exits with a non-zero exit code, the host is considered down |

#### Turning on

| Key | Description |
| --- | ------------|
| mac | The device's MAC address - used to send Magic Packets. Allows any format such as `XX:XX:XX:XX:XX:XX` or `XXXXXXXXXXXX` |
| broadcastAddress | The broadcast address to use when sending the Wake on LAN packet |
| startCommand | Command to run in order to start the machine |
| wakeGraceTime | Number of seconds to wait after startup before checking online status and issuing the `wakeCommand`, default `45` |
| wakeCommand | Command to run after initial startup, useful for macOS users in need of running `caffeinate` |

#### Turning off

| Key | Description |
| --- | ------------|
| shutdownCommand | Command to run in order to shut down the remote machine |
| shutdownGraceTime | Number of seconds to wait after shutdown before checking offline status, default `15` |

#### Logging

| Key | Description |
| --- | ------------|
| log | Whether or not the plugin should log status messages, default `true` |
| logPinger | Whether or not the plugin should log ping messages (state transitions), default `false` |
| debugLog | Whether or not the plugin should log debug information, default `false` |

#### Miscellaneous

| Key | Description |
| --- | ------------|
| returnEarly | Whether or not to let the plugin return early to mitigate Siri issue (see https://github.com/AlexGustafsson/homebridge-wol/issues/85). Defaults to `false` |

<a id="lifecycle"></a>
## Lifecycle

Whenever Homebridge starts, the plugin will check the state of all configured devices. This is done by pinging or executing the `pingCommand` once, depending on the configuration. If the pinging or `pingCommand` executes successfully, the device is considered online and vice versa.

The pinging by actual pings or use of the `pingCommand` will continue in the background, monitoring the state of the device. If `pingsToChange` (defaults to 5) pings have the same result and that result is not the current state, the state of the device will be considered changed. If `pingCommand` is configured, it is used instead of actual pings and will result in an immediate state change.

This pinging will result in state changes between online and offline.

Whenever you flick a switch to its on position via HomeKit, the device is marked as "turning on". Then a WoL packet is sent to the device if a MAC address is configured and if a `startCommand` is configured, it is also executed immediately. After the device has been started, it is marked as online. Then the plugin will wait for the time configured by `wakeGraceTime` (defaults to 45s). If a `wakeCommand` is configured, it will be called after the wait is over. Once all commands are completed, the device will be monitored again by the pinger - switching its state automatically.

Whenever you flick a switch to its off position via HomeKit, the device is immediately marked as turning off. A shutdown command is executed if it is configured. After the command's completion (or directly if none is configured), the plugin will wait for `shutdownGraceTime` (defaults to 15s) before continuing to monitor the device using the configured pinging method.

<a id="faq"></a>
## Notes and FAQ

### Permissions
This plugin requires extra permissions due to the use of pinging and magic packages. Start Homebridge using `sudo homebridge` or change capabilities accordingly (`setcap cap_net_raw=pe /path/to/bin/node`). Systemd users can add the following lines to the `[Service]` section of Homebridge's unit file (or create a drop-in if unit is packaged by your distro) to achieve this in a more secure way like so:
```
CapabilityBoundingSet=CAP_NET_RAW
AmbientCapabilities=CAP_NET_RAW
```

### Waking an Apple computer
The Macbook configuration example uses `caffeinate` in order to keep the computer alive after the initial wake-up. See [this issue](https://github.com/AlexGustafsson/homebridge-wol/issues/30#issuecomment-368733512) for more information.

### Controlling a Windows PC

The Windows configuration example requires the `samba-common` package to be installed on the server. If you're on Windows 10 and you're signing in with a Microsoft account, the command should use your local username instead of your Microsoft ID (e-mail). Also note that you may or may not need to run `net rpc` with `sudo`.

### SSH as wake or shutdown command
The Raspberry Pi example uses the `sshpass` package to sign in on the remote host. The `-oStrictHostKeyChecking=no` parameter permits any key that the host may present. **This usage is heavily discouraged. You should be using SSH keys to authenticate yourself.**

### Secrets in the configuration
Using username and passwords in a command is **heavily discouraged** as this stores them in the configuration file in plaintext. Use other authentication methods or environment variables instead.

<a id="contribute"></a>
## Contribute

Any contribution is welcome. If you're not able to code it yourself, perhaps someone else is - so post an issue if there's anything on your mind.

If you're new to the open source community, JavaScript, GitHub or just uncertain where to begin - [issues labeled "good first issue"](https://github.com/AlexGustafsson/homebridge-wol/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) are a great place to start. Just comment on an issue you'd like to investigate and you'll get guidance along the way.

### Contributors

This repository has evolved thanks to you. Issues reporting bugs, missing features or quirks are always a welcome method to help grow this project.

Beyond all helpful issues, this repository has seen modifications from these helpful contributors:

| [<img src="https://avatars1.githubusercontent.com/u/14974112?v=4" width="60px;" width="60px;"/><br /><sub><b>@AlexGustafsson</b></sub>](https://github.com/AlexGustafsson)<br /> <sub>Author</sub> | [<img src="https://avatars1.githubusercontent.com/u/1850718?v=4" width="60px;" width="60px;"/><br /><sub><b>@cr3ative</b></sub>](https://github.com/cr3ative)<br /> <sub>Previous collaborator</sub> | [<img src="https://avatars1.githubusercontent.com/u/171494?v=4" width="60px;" width="60px;"/><br /><sub><b>@blubber</b></sub>](https://github.com/blubber)<br /> <sub>Previous collaborator</sub> |
| :---: | :---: | :---: |
| [<img src="https://avatars1.githubusercontent.com/u/727711?v=4" width="60px;" width="60px;"/><br /><sub><b>@lnxbil</b></sub>](https://github.com/lnxbil)<br /> <sub>Contributor</sub> | [<img src="https://avatars1.githubusercontent.com/u/813112?v=4" width="60px;" width="60px;"/><br /><sub><b>@residentsummer</b></sub>](https://github.com/residentsummer)<br /> <sub>Contributor</sub> | [<img src="https://avatars1.githubusercontent.com/u/1338860?v=4" width="60px;" width="60px;"/><br /><sub><b>@JulianRecke</b></sub>](https://github.com/JulianRecke)<br /> <sub>Contributor</sub> |
| [<img src="https://avatars1.githubusercontent.com/u/3981445?v=4" width="60px;"/><br /><sub><b>@tanmaster</b></sub>](https://github.com/tanmaster)<br /> <sub>Contributor</sub> | [<img src="https://avatars0.githubusercontent.com/u/5369727?v=4" width="60px;"/><br /><sub><b>@HenrySeed</b></sub>](https://github.com/HenrySeed)<br /> <sub>Logo designer</sub> | |

### Development

```
# Clone project
git clone https://github.com/AlexGustafsson/homebridge-wol.git && cd homebridge-wol

# Set up for development
npm install && npm link

# Make sure linting passes
npm run lint

# Try to start Homebridge with the Homebridge Config UI X - available on localhost:8080
# with default credentials admin:admin
npm run test
```
