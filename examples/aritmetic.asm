# Arithmetic Operations (R-type and I-type)

# Demonstrates: add, sub, addi, xori, or, and
# Expected register results:
#   x1 = 10  (addi x1, x0, 10)
#   x2 = 4   (addi x2, x0, 4)
#   x3 = 14  (add x3, x1, x2)   -> 10 + 4
#   x4 = 6   (sub x4, x1, x2)   -> 10 - 4
#   x5 = 14  (xor x5, x3, x4)   -> 14 xor 6 = 8... wait, 14 xor 6 = 8
#   x6 = 14  (or x6, x3, x4)    -> 14 or 6 = 14
#   x7 = 6   (and x7, x3, x4)   -> 14 and 6 = 6

addi x1, x0, 10
addi x2, x0, 4
add  x3, x1, x2
sub  x4, x1, x2
xor  x5, x3, x4
or   x6, x3, x4
and  x7, x3, x4
