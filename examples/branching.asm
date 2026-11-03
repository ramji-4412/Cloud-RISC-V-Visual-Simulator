# Branching Operations

# Demonstrates: beq (taken), bne (not taken), blt, bge, bltu, bgeu
# Expected register results:
#   x1 = 5
#   x2 = 10
#   x3 = 1   (blt x1, x2 -> 5 < 10 is true)
#   x4 = 0   (bge x1, x2 -> 5 >= 10 is false)
#   x5 = 1   (bltu x1, x2 -> unsigned 5 < 10 is true)
#   x6 = 0   (bgeu x1, x2 -> unsigned 5 >= 10 is false)
#   x7 = 99  (falls through both taken branches)

addi x1, x0, 5
addi x2, x0, 10

# blt x1, x2, taken -> x3 = 1
blt  x1, x2, +4
addi x3, x0, 0
addi x3, x0, 1

# bge x1, x2, not taken -> x4 stays 0
bge  x1, x2, +4
addi x4, x0, 0
addi x4, x0, 1

# bltu x1, x2, taken -> x5 = 1
bltu x1, x2, +4
addi x5, x0, 0
addi x5, x0, 1

# bgeu x1, x2, not taken -> x6 stays 0
bgeu x1, x2, +4
addi x6, x0, 0
addi x6, x0, 1

# beq x1, x2, not taken -> x7 = 99 (falls through)
beq  x1, x2, +4
addi x7, x0, 0
addi x7, x0, 99
