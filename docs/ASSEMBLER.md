# Assembler Reference

## Overview

The RV32I assembler is a pure-Python, two-pass assembler implemented in
`backend/app/assembler.py`. It converts human-readable assembly source into
32-bit RISC-V machine code, with label resolution, ABI register aliases,
immediate encoding, range validation, and line-specific error reporting.

It is exposed through two FastAPI endpoints:
- `POST /api/assembler/assemble` — assemble only
- `POST /api/assembler/assemble-and-load` — assemble and load into the simulator

## Two-Pass Assembly

### Pass 1: Label Collection

Scans all source lines, tracking the current address (incrementing by 4 per
instruction). When a line contains a label (`label:`), the label is recorded
with the current address. Labels do not consume an address themselves unless
followed by an instruction on the same line.

**Label rules**:
- Must match `^[a-zA-Z_][a-zA-Z0-9_]*$`
- Cannot be empty
- Cannot be duplicated
- Comments (`#` or `//`) are stripped before label detection

### Pass 2: Instruction Encoding

Re-scans all source lines, skipping labels and blank lines, and encodes each
instruction into machine code. Label references in branch and jump targets are
resolved using the address map from Pass 1.

## Supported Instructions

### R-Type (opcode `0110011`)

| Mnemonic | funct7 | funct3 | Description |
|----------|--------|--------|-------------|
| add | 0000000 | 000 | Add |
| sub | 0100000 | 000 | Subtract |
| sll | 0000000 | 001 | Shift left logical |
| slt | 0000000 | 010 | Set less than (signed) |
| sltu | 0000000 | 011 | Set less than (unsigned) |
| xor | 0000000 | 100 | XOR |
| srl | 0000000 | 101 | Shift right logical |
| sra | 0100000 | 101 | Shift right arithmetic |
| or | 0000000 | 110 | OR |
| and | 0000000 | 111 | AND |

**Operands**: `rd, rs1, rs2`

### I-Type ALU (opcode `0010011`)

| Mnemonic | funct3 | Description | Immediate Range |
|----------|--------|-------------|-----------------|
| addi | 000 | Add immediate | -2048 to 2047 |
| slti | 010 | Set less than immediate (signed) | -2048 to 2047 |
| sltiu | 011 | Set less than immediate (unsigned) | -2048 to 2047 |
| xori | 100 | XOR immediate | -2048 to 2047 |
| ori | 110 | OR immediate | -2048 to 2047 |
| andi | 111 | AND immediate | -2048 to 2047 |
| slli | 001 | Shift left logical immediate | shamt in imm field |
| srli | 101 | Shift right logical immediate | shamt in imm field |
| srai | 101 | Shift right arithmetic immediate | shamt in imm field, funct7=0100000 |

**Operands**: `rd, rs1, imm`

### Load (opcode `0000011`)

| Mnemonic | funct3 | Description |
|----------|--------|-------------|
| lw | 010 | Load word |

**Operands**: `rd, imm(rs1)`
**Immediate Range**: -2048 to 2047

### Store (opcode `0100011`)

| Mnemonic | funct3 | Description |
|----------|--------|-------------|
| sw | 010 | Store word |

**Operands**: `rs2, imm(rs1)`
**Immediate Range**: -2048 to 2047

### Branch (opcode `1100011`)

| Mnemonic | funct3 | Description |
|----------|--------|-------------|
| beq | 000 | Branch if equal |
| bne | 001 | Branch if not equal |
| blt | 100 | Branch if less than (signed) |
| bge | 101 | Branch if greater/equal (signed) |
| bltu | 110 | Branch if less than (unsigned) |
| bgeu | 111 | Branch if greater/equal (unsigned) |

**Operands**: `rs1, rs2, label`
**Offset Range**: -4096 to 4094 (must be even)

Branches can target a numeric immediate or a label. Label targets are resolved
to a PC-relative offset during Pass 2.

### Jumps

| Mnemonic | Opcode | Operands | Offset Range |
|----------|--------|----------|--------------|
| jal | 1101111 | `rd, label` | -1048576 to 1048574 (even) |
| jalr | 1100111 | `rd, rs1, imm` or `rd, imm(rs1)` | -2048 to 2047 |

### Upper-Immediate

| Mnemonic | Opcode | Operands | Description |
|----------|--------|----------|-------------|
| lui | 0110111 | `rd, imm` | Load upper immediate (imm << 12) |
| auipc | 0010111 | `rd, imm` | Add upper immediate to PC (imm << 12) |

**Immediate Range**: treated as 20-bit upper value (0 to 0xFFFFF)

## Register Encoding

Registers can be specified by architectural name (`x0`–`x31`) or ABI alias:

| x-reg | ABI | x-reg | ABI | x-reg | ABI | x-reg | ABI |
|-------|-----|-------|-----|-------|-----|-------|-----|
| x0 | zero | x8 | s0/fp | x16 | a0 | x24 | s8 |
| x1 | ra | x9 | s1 | x17 | a1 | x25 | s9 |
| x2 | sp | x10 | a0 | x18 | a2 | x26 | s10 |
| x3 | gp | x11 | a1 | x19 | a3 | x27 | s11 |
| x4 | tp | x12 | a2 | x20 | a4 | x28 | t3 |
| x5 | t0 | x13 | a3 | x21 | a5 | x29 | t4 |
| x6 | t1 | x14 | a4 | x22 | a6 | x30 | t5 |
| x7 | t2 | x15 | a5 | x23 | a7 | x31 | t6 |

x0 is hardwired to zero; writes to x0 are silently dropped by the hardware.

## Immediate Encoding

Immediates can be written in decimal, hex (`0x` prefix), or binary (`0b` prefix).
Range validation is performed per instruction type:
- I-type ALU/load/store/jalr immediate: -2048 to 2047
- Branch offset: -4096 to 4094 (must be even)
- Jump offset: -1048576 to 1048574 (must be even)
- LUI/AUIPC: 0 to 0xFFFFF (20-bit upper)

## Machine-Code Output Format

The assembler returns:
```json
{
  "success": true,
  "instruction_count": 6,
  "instructions": [
    {
      "address": "0x00000000",
      "source_line": 1,
      "assembly": "addi x1, x0, 5",
      "machine_code": "0x00500093",
      "hex": "00500093"
    },
    ...
  ],
  "machine_code": ["00500093", "00700113", ...],
  "errors": []
}
```

- `address`: byte address as hex string (`0x00000000`, `0x00000004`, ...)
- `source_line`: 1-based source line number
- `assembly`: original source line text
- `machine_code`: full 32-bit value with `0x` prefix
- `hex`: 8-digit hex without prefix (for .hex file output)

## Error Reporting

Errors are reported per-line with line number, category, message, and source
context:

```json
{
  "success": false,
  "instruction_count": 0,
  "instructions": [],
  "machine_code": [],
  "errors": [
    {
      "line": 1,
      "category": "ASSEMBLY_ERROR",
      "message": "Invalid register: x40",
      "source": "addi x40, x0, 5"
    }
  ]
}
```

**Error categories**:
- `ASSEMBLY_ERROR` — encoding errors (invalid register, unknown instruction,
  out-of-range immediate, uneven branch/jump offset, undefined label, etc.)
- `SECURITY` — invalid filename (path traversal attempt)
- `IO_ERROR` — file write failure

## API Endpoints

### POST /api/assembler/assemble

**Request**: `{"source": "<assembly text>"}`
**Response**: `AssembleResponse` — success flag, instruction list, machine code,
errors.

### POST /api/assembler/assemble-and-load

**Request**: `{"source": "<assembly text>", "program_file": "<name>.hex"}`
**Response**: `AssembleAndLoadResponse` — assemble result plus `load_result`
from the simulator.

**Filename validation**:
- Must not contain `/`, `\`, or `..`
- Must end with `.hex`
- File is written to `hardware/sim/` via WSL, then loaded into the simulator

## Example: Phase A Program

**Source**:
```
addi x1, x0, 5
addi x2, x0, 7
add  x3, x1, x2
sw   x3, 0(x0)
lw   x4, 0(x0)
addi x5, x4, 1
```

**Machine code**:
| Address | Assembly | Hex |
|---------|----------|-----|
| 0x00000000 | addi x1, x0, 5 | 00500093 |
| 0x00000004 | addi x2, x0, 7 | 00700113 |
| 0x00000008 | add x3, x1, x2 | 002081B3 |
| 0x0000000C | sw x3, 0(x0) | 00302023 |
| 0x00000010 | lw x4, 0(x0) | 00002203 |
| 0x00000014 | addi x5, x4, 1 | 00120293 |

**Expected results after execution**: x1=5, x2=7, x3=12, x4=12, x5=13,
memory[0]=12.
