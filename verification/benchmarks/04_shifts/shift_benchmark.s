# RV32I Verification Benchmark 04: Shift Instructions
# Tests SLL, SRL, SRA, SLLI, SRLI, SRAI
# Tests shift amounts 0, 1, 4, 5, 31, sign extension vs zero fill, and 5-bit shift masking.

# Base operands
addi x1, x0, 1
addi x2, x0, -1

# Immediate shifts (SLLI, SRLI, SRAI)
slli x3, x1, 4
slli x4, x1, 31
srli x5, x4, 31
srai x6, x4, 31
srli x7, x4, 1
srai x8, x4, 1

# Shift by 0
slli x9, x4, 0
srli x10, x4, 0
srai x11, x4, 0

# Register shifts (SLL, SRL, SRA)
addi x12, x0, 5
sll  x13, x1, x12
srl  x14, x7, x12
sra  x15, x8, x12

# Register shift amount masking with low 5 bits (rs2[4:0]): 36 & 0x1F = 4
addi x16, x0, 36
sll  x17, x1, x16
srl  x18, x4, x16
sra  x19, x4, x16
