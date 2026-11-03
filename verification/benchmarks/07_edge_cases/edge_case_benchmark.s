# RV32I Verification Benchmark 07: Architectural Edge Cases
# Tests x0 hardwired behavior, 12-bit signed immediate boundaries (-2048 and +2047),
# 32-bit two's complement overflow and underflow wrapping, unaligned memory access handling,
# and AUIPC relative PC calculation.

# Test 1: Hardwired x0 discard on write and read
addi x0, x0, 999
add  x1, x0, x0

# Test 2: Immediate boundary values
addi x2, x0, 2047
addi x3, x0, -2048

# Test 3: Arithmetic overflow and underflow wrapping
lui  x4, 0x80000
addi x5, x4, -1
addi x6, x5, 1
addi x7, x0, 0
addi x8, x7, -1

# Test 4: Aligned vs unaligned memory accesses
addi x9, x0, 291
sw   x9, 0(x0)
addi x10, x0, 999
sw   x10, 1(x0)
lw   x11, 1(x0)
lw   x12, 0(x0)

# Test 5: AUIPC calculation (PC = 0x3C = 60, offset = 4096)
auipc x13, 1
