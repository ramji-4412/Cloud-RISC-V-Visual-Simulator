# RV32I Verification Benchmark 02: Jump Instructions
# Tests JAL, JALR, link register writes, indirect jumps, backward loops, function call/return.

# Instruction 0 (0x00): Init register
addi x2, x0, 1

# Instruction 1 (0x04): JAL saving return address to x1 (ra)
jal x1, func_a

# Instruction 2 (0x08): Execution resumes here after return (x1 = 0x08)
addi x11, x10, 1

# Instruction 3 (0x0C): JAL to x0 (discard return address, jump over dead code)
jal x0, skip_dead

# Instruction 4 (0x10): Dead code (must not execute)
addi x12, x0, 99

skip_dead:
# Instruction 5 (0x14): Target of JAL to x0
addi x12, x0, 20

# Instruction 6 (0x18): Loop initialization
addi x3, x0, 3

# Instruction 7 (0x1C): Loop accumulator
addi x13, x0, 0

loop_top:
# Instruction 8 (0x20): Loop body
addi x13, x13, 10
addi x3, x3, -1
bne x3, x0, loop_top

# Instruction 11 (0x2C): Base address setup for JALR (0x40 = 64)
addi x4, x0, 64

# Instruction 12 (0x30): JALR to x4 + 8 = 72 (0x48). Link address saved in x5 (0x34 = 52).
jalr x5, x4, 8

# Instruction 13-17 (0x34-0x44): Padding instructions skipped by JALR
addi x14, x0, 99
addi x14, x0, 99
addi x14, x0, 99
addi x14, x0, 99
addi x14, x0, 99

jalr_target:
# Instruction 18 (0x48): JALR landing target
addi x14, x0, 77
jal x0, jump_done

func_a:
# Subroutine: sets return value in x10 and returns via JALR
addi x10, x0, 42
jalr x0, x1, 0

jump_done:
addi x15, x0, 88
