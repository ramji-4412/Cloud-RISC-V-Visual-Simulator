# Load/Store Operations

# Demonstrates: sw, lw
# Expected results:
#   x1 = 42
#   memory[0] = 42
#   x2 = 42  (loaded back from memory[0])
#   memory[4] = 99  (stored directly)
#   x3 = 99  (loaded from memory[4])

addi x1, x0, 42
sw   x1, 0(x0)     # store 42 at address 0
lw   x2, 0(x0)     # load 42 from address 0
addi x3, x0, 99
sw   x3, 4(x0)     # store 99 at address 4
lw   x4, 4(x0)     # load 99 from address 4
