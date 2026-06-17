using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.IO;
using System.Collections.Generic;

namespace ZKTecoSDKBridge
{
    class Program
    {
        static dynamic zkem = null;
        static Type zkemType = null;
        static int machineNumber = 1;
        static bool connected = false;
        static int listenPort = 3457;

        static void Main(string[] args)
        {
            if (args.Length > 0 && int.TryParse(args[0], out int port))
                listenPort = port;

            Console.WriteLine("SDKBridge starting on port " + listenPort + "...");

            try
            {
                zkemType = Type.GetTypeFromProgID("zkemkeeper.ZKEM");
                if (zkemType == null)
                {
                    Console.Error.WriteLine("ERROR: zkemkeeper.ZKEM not registered");
                    Environment.Exit(1);
                    return;
                }
                zkem = Activator.CreateInstance(zkemType);
                Console.WriteLine("SDKBridge initialized successfully");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"ERROR initializing COM: {ex.Message}");
                Environment.Exit(1);
                return;
            }

            var listener = new TcpListener(IPAddress.Loopback, listenPort);
            listener.Start();
            Console.WriteLine($"SDKBridge listening on 127.0.0.1:{listenPort}");

            while (true)
            {
                try
                {
                    var client = listener.AcceptTcpClient();
                    _ = HandleClientAsync(client);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Accept error: {ex.Message}");
                }
            }
        }

        static async Task HandleClientAsync(TcpClient client)
        {
            using (client)
            {
                client.ReceiveTimeout = 30000;
                client.SendTimeout = 10000;
                var stream = client.GetStream();
                var buffer = new byte[65536];

                try
                {
                    int bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length);
                    if (bytesRead == 0) return;

                    string request = Encoding.UTF8.GetString(buffer, 0, bytesRead).Trim();
                    var response = ProcessCommand(request);
                    string json = JsonSerializer.Serialize(response) + "\n";
                    byte[] responseBytes = Encoding.UTF8.GetBytes(json);
                    await stream.WriteAsync(responseBytes, 0, responseBytes.Length);
                }
                catch (Exception ex)
                {
                    var err = new { status = "error", message = ex.Message };
                    string json = JsonSerializer.Serialize(err) + "\n";
                    byte[] bytes = Encoding.UTF8.GetBytes(json);
                    try { await stream.WriteAsync(bytes, 0, bytes.Length); } catch { }
                }
            }
        }

        static object ProcessCommand(string request)
        {
            try
            {
                var cmd = JsonSerializer.Deserialize<JsonElement>(request);
                if (!cmd.TryGetProperty("cmd", out var cmdProp))
                    return new { status = "error", message = "missing cmd" };

                string command = cmdProp.GetString() ?? "";
                var hasParams = cmd.TryGetProperty("params", out var paramsEl);
                var p = hasParams ? paramsEl : default;

                return command switch
                {
                    "connect" => Connect(p),
                    "disconnect" => Disconnect(),
                    "status" => GetStatus(),
                    "info" => GetInfo(),
                    "get-attendance" => GetAttendance(p),
                    "get-users" => GetUsers(),
                    "inject-attendance" => InjectAttendance(p),
                    "set-device-time" => SetDeviceTime(p),
                    _ => new { status = "error", message = $"unknown cmd: {command}" }
                };
            }
            catch (JsonException ex)
            {
                return new { status = "error", message = $"invalid JSON: {ex.Message}" };
            }
        }

        static object Connect(JsonElement p)
        {
            try
            {
                string ip = "192.168.15.50";
                int port = 4370;
                if (p.ValueKind == JsonValueKind.Object)
                {
                    if (p.TryGetProperty("ip", out var ipProp)) ip = ipProp.GetString() ?? ip;
                    if (p.TryGetProperty("port", out var portProp)) port = portProp.GetInt32();
                }

                zkemType.InvokeMember("SetCommPassword", System.Reflection.BindingFlags.InvokeMethod, null, zkem, new object[] { 0 });
                bool result = (bool)zkemType.InvokeMember("Connect_Net", System.Reflection.BindingFlags.InvokeMethod, null, zkem, new object[] { ip, port });

                if (!result)
                {
                    int errorCode = (int)zkemType.InvokeMember("GetLastError", System.Reflection.BindingFlags.InvokeMethod, null, zkem, null);
                    return new { status = "error", message = $"Connection failed. Error code: {errorCode}" };
                }

                zkemType.InvokeMember("RegEvent", System.Reflection.BindingFlags.InvokeMethod, null, zkem, new object[] { 1, 0xFFFF });
                machineNumber = 1;
                connected = true;
                return new { status = "ok", machineNumber = 1, ip, port };
            }
            catch (Exception ex)
            {
                return new { status = "error", message = ex.Message };
            }
        }

        static object Disconnect()
        {
            try
            {
                if (zkem != null)
                {
                    zkemType.InvokeMember("Disconnect", System.Reflection.BindingFlags.InvokeMethod, null, zkem, null);
                }
                connected = false;
                return new { status = "ok" };
            }
            catch (Exception ex)
            {
                return new { status = "error", message = ex.Message };
            }
        }

        static object GetStatus()
        {
            return new { status = "ok", connected };
        }

        static object GetInfo()
        {
            try
            {
                if (!connected) return new { status = "error", message = "not connected" };

                string deviceName = "";

                object vendorResult = zkemType.InvokeMember("GetVendor", System.Reflection.BindingFlags.InvokeMethod, null, zkem, null);
                object productResult = zkemType.InvokeMember("GetProductCode", System.Reflection.BindingFlags.InvokeMethod, null, zkem, null);
                object serialResult = zkemType.InvokeMember("GetSerialNumber", System.Reflection.BindingFlags.InvokeMethod, null, zkem, null);
                object firmwareResult = zkemType.InvokeMember("GetFirmwareVersion", System.Reflection.BindingFlags.InvokeMethod, null, zkem, null);
                object platformResult = zkemType.InvokeMember("GetPlatform", System.Reflection.BindingFlags.InvokeMethod, null, zkem, null);
                object deviceInfoResult = zkemType.InvokeMember("GetDeviceInfo", System.Reflection.BindingFlags.InvokeMethod, null, zkem, new object[] { machineNumber });

                return new
                {
                    status = "ok",
                    data = new
                    {
                        vendor = vendorResult?.ToString() ?? "",
                        productCode = productResult?.ToString() ?? "",
                        serialNumber = serialResult?.ToString() ?? "",
                        firmwareVersion = firmwareResult?.ToString() ?? "",
                        platform = platformResult?.ToString() ?? "",
                        deviceInfo = deviceInfoResult?.ToString() ?? ""
                    }
                };
            }
            catch (Exception ex)
            {
                return new { status = "error", message = ex.Message };
            }
        }

        static object GetAttendance(JsonElement p)
        {
            try
            {
                if (!connected) return new { status = "error", message = "not connected" };

                int totalCount = 0;
                var records = new List<object>();

                object countResult = zkemType.InvokeMember("GetGeneralLogData", System.Reflection.BindingFlags.InvokeMethod, null, zkem, new object[] { machineNumber });

                if (!(countResult is int dwEnrollNumber))
                {
                    return new { status = "error", message = "Failed to get attendance data" };
                }

                totalCount = dwEnrollNumber;

                if (totalCount <= 0)
                {
                    return new { status = "ok", records = new object[0], count = 0 };
                }

                string enrollNumber = "";
                int verifyMode = 0;
                int inOutMode = 0;
                int year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0;
                int workCode = 0;

                while (true)
                {
                    bool hasRecord = (bool)zkemType.InvokeMember("SSR_GetGeneralLogData",
                        System.Reflection.BindingFlags.InvokeMethod, null, zkem,
                        new object[] { machineNumber, ref enrollNumber, ref verifyMode, ref inOutMode, ref year, ref month, ref day, ref hour, ref minute, ref second, ref workCode });

                    if (!hasRecord) break;

                    var timestamp = new DateTime(year, month, day, hour, minute, second);

                    records.Add(new
                    {
                        deviceUserId = enrollNumber.TrimEnd('\0'),
                        userId = enrollNumber.TrimEnd('\0'),
                        verifyMode,
                        inOutMode,
                        timestamp = timestamp.ToString("yyyy-MM-ddTHH:mm:ss"),
                        status = 0,
                        workCode
                    });
                }

                return new { status = "ok", records = records.ToArray(), count = records.Count };
            }
            catch (Exception ex)
            {
                return new { status = "error", message = ex.Message };
            }
        }

        static object GetUsers()
        {
            try
            {
                if (!connected) return new { status = "error", message = "not connected" };

                var users = new List<object>();

                string enrollNumber = "";
                string name = "";
                int privilege = 0;
                bool enabled = true;

                while (true)
                {
                    bool hasUser = (bool)zkemType.InvokeMember("SSR_GetAllUserInfo",
                        System.Reflection.BindingFlags.InvokeMethod, null, zkem,
                        new object[] { machineNumber, ref enrollNumber, ref name, ref privilege, ref enabled });

                    if (!hasUser) break;

                    users.Add(new
                    {
                        userId = enrollNumber.TrimEnd('\0'),
                        name = name.TrimEnd('\0'),
                        privilege,
                        enabled
                    });
                }

                return new { status = "ok", users = users.ToArray(), count = users.Count };
            }
            catch (Exception ex)
            {
                return new { status = "error", message = ex.Message };
            }
        }

        static object InjectAttendance(JsonElement p)
        {
            try
            {
                if (!connected) return new { status = "error", message = "not connected" };
                if (p.ValueKind != JsonValueKind.Object)
                    return new { status = "error", message = "params required" };

                string userId = p.TryGetProperty("userId", out var uid) ? uid.GetString() ?? "" : "";
                string timestampStr = p.TryGetProperty("timestamp", out var ts) ? ts.GetString() ?? "" : "";

                if (string.IsNullOrEmpty(userId)) return new { status = "error", message = "userId required" };
                if (string.IsNullOrEmpty(timestampStr)) return new { status = "error", message = "timestamp required" };

                DateTime timestamp;
                if (!DateTime.TryParse(timestampStr, out timestamp))
                    return new { status = "error", message = "invalid timestamp format" };

                int inOutMode = 0;
                if (p.TryGetProperty("inOutMode", out var iom)) inOutMode = iom.GetInt32();

                int verifyMode = 0;
                if (p.TryGetProperty("verifyMode", out var vm)) verifyMode = vm.GetInt32();

                int workCode = 0;
                if (p.TryGetProperty("workCode", out var wc)) workCode = wc.GetInt32();

                int reserved = 0;
                bool success = (bool)zkemType.InvokeMember("SSR_SetDeviceData",
                    System.Reflection.BindingFlags.InvokeMethod, null, zkem,
                    new object[] { machineNumber, 12, userId, inOutMode, verifyMode,
                        timestamp.Year, timestamp.Month, timestamp.Day,
                        timestamp.Hour, timestamp.Minute, timestamp.Second, workCode, reserved });

                if (success)
                {
                    zkemType.InvokeMember("RefreshData", System.Reflection.BindingFlags.InvokeMethod, null, zkem, new object[] { machineNumber });
                    return new { status = "ok", injected = true };
                }

                int errorCode = (int)zkemType.InvokeMember("GetLastError", System.Reflection.BindingFlags.InvokeMethod, null, zkem, null);
                return new { status = "error", message = $"Inject failed. Error code: {errorCode}" };
            }
            catch (Exception ex)
            {
                return new { status = "error", message = ex.Message };
            }
        }

        static object SetDeviceTime(JsonElement p)
        {
            try
            {
                if (!connected) return new { status = "error", message = "not connected" };

                DateTime now = DateTime.Now;
                zkemType.InvokeMember("SetDeviceTime", System.Reflection.BindingFlags.InvokeMethod, null, zkem,
                    new object[] { machineNumber, now.Year, now.Month, now.Day, now.Hour, now.Minute, now.Second });

                return new { status = "ok", time = now.ToString("yyyy-MM-dd HH:mm:ss") };
            }
            catch (Exception ex)
            {
                return new { status = "error", message = ex.Message };
            }
        }
    }
}
