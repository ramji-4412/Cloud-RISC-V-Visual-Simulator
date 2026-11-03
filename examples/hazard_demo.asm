# Load-Use Hazard Demonstration

# Demonstrates: lw followed by dependent addi creates a one-cycle stall
# Expected register results:
#   x1 = 42  (stored to memory[0])
#   x2 = 42  (loaded from memory[0])
#   x3 = 43  (addi x3, x2, 1 -- depends on load, will stall)

addi x1, x0, 42
sw   x1, 0(x0)
lw   x2, 0(x0)
addi x3, x2, 1
