1.11x版本（111）：适配的是sbshell，outbound填充用的是singbox专用订阅后端  

111_iphone.json：1.11X版本使用的手机配置文件
111_tproxy.json：
111_tun.json：


1.12X版本（112）：适配的是momo，也包含手机和裸核，outbound填充用的有专用后端，substore、以及fork支持订阅的版本。 
 
112config.json：仅内核的配置文件，所有配置完全依赖配置文件，在插件中的设置不起作用。
112iphone.json：iphone手机使用的配置，1.11X的不适用
112momo.json：momo插件（openwrt或其它）使用的非fakeIP模式
112momofake.json：momo插件（openwrt或其它）使用的fakeIP模式
112sub-momofake.json：momo插件（openwrt或其它）使用的sub-store订阅专用的配置
112fork-momofake.json：momo插件使用第三方singbox内核的配置文件，可以直接拉取订阅