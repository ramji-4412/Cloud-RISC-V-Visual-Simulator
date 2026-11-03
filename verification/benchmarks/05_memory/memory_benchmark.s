# RV32I Verification Benchmark 05: Memory Operations
# Tests SW, LW, word-aligned addressing, overwriting memory, negative offsets, and memory persistence.

# Base address setup
addi x1, x0, 0
addi x2, x0, 100
addi x3, x0, 200
addi x4, x0, 300
addi x5, x0, 400
addi x6, x0, 500

# Store values to sequential word addresses
sw x2, 0(x1)
sw x3, 4(x1)
sw x4, 8(x1)
sw x5, 12(x1)
sw x6, 16(x1)

# Load values back into destination registers
lw x10, 0(x1)
lw x11, 4(x1)
lw x12, 8(x1)
lw x13, 12(x1)
lw x14, 16(x1)

# Overwrite existing word at address 8
addi x7, x0, 999
sw x7, 8(x1)
lw x15, 8(x1)

# Negative immediate offset with non-zero base
addi x8, x0, 32
addi x9, x0, 777
sw x9, -8(x8)
lw x16, -8(x8)
