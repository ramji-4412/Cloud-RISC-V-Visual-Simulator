import subprocess, json, threading

proc = subprocess.Popen(
    ['wsl.exe', '-d', 'Ubuntu', '--', '/home/pc/riscv-verilator-build/Vriscv_sim_top'],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
)

def drain():
    for line in proc.stderr:
        print('STDERR:', line.strip(), flush=True)
threading.Thread(target=drain, daemon=True).start()

cmd = '{"command": "load_program", "program_file": "/mnt/d/RISC-V_Project/hardware/sim/program.hex"}\n'
proc.stdin.write(cmd)
proc.stdin.flush()

for _ in range(10):
    line = proc.stdout.readline()
    if not line:
        print('EOF reached')
        break
    line = line.strip()
    if not line:
        continue
    try:
        resp = json.loads(line)
        print('RESPONSE:', resp)
        break
    except json.JSONDecodeError:
        print('NON-JSON:', line)

proc.stdin.write('{"command": "quit"}\n')
proc.stdin.flush()
proc.wait(timeout=5)
print('Exit code:', proc.returncode)
