import paramiko
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

LOCAL_DIR = r"c:\Users\leduc\Documents\antigravity\zealous-hertz"
REMOTE_DIR = "/var/www/tiktok-tools.nodelee.tech"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting to VPS 76.13.211.166...")
    ssh.connect('76.13.211.166', username='root', password='LeDucNam010203@123', timeout=15)
    print("Connected.")

    # 1. Backup
    print("Creating backups on VPS...")
    ssh.exec_command(f"cp {REMOTE_DIR}/index.html {REMOTE_DIR}/index.html.bak_v37")

    # 2. SFTP upload
    sftp = ssh.open_sftp()
    print("Uploading index.html...")
    sftp.put(os.path.join(LOCAL_DIR, "index.html"), f"{REMOTE_DIR}/index.html")
    sftp.close()

    # 3. Restart systemd service
    print("Restarting tiktok-tools-api.service...")
    stdin, stdout, stderr = ssh.exec_command("systemctl restart tiktok-tools-api.service && systemctl is-active tiktok-tools-api.service")
    status = stdout.read().decode('utf-8', errors='replace').strip()
    print("Service status:", status)

    # 4. Check index.html version
    stdin, stdout, stderr = ssh.exec_command(f"grep -o 'Logistics Pro v[0-9.]*' {REMOTE_DIR}/index.html | head -n 3")
    print("VPS index.html version:\n", stdout.read().decode('utf-8', errors='replace'))

    # 5. Check Nginx caching or test curl
    stdin, stdout, stderr = ssh.exec_command(f"grep -n 'NAVET-VITAMINO LITE' {REMOTE_DIR}/index.html | head -n 5")
    print("Grep verification on VPS:\n", stdout.read().decode('utf-8', errors='replace'))

    ssh.close()
    print("\nDeployment to VPS v3.8 complete successfully!")
except Exception as e:
    print("Deployment error:", e)
    sys.exit(1)
