# RV32I Verification Benchmark 03: Arithmetic and Logic Instructions
# Tests ADD, SUB, SLT, SLTU, AND, OR, XOR, ADDI, SLTI, SLTIU, ANDI, ORI, XORI

# Setup initial operands
addi x1, x0, 15
addi x2, x0, 25
addi x3, x0, -10

# ADD and ADDI operations
add  x4, x1, x2
addi x5, x1, 5
addi x6, x3, 20
addi x7, x1, -20

# SUB operations
sub  x8, x2, x1
sub  x9, x1, x2
sub  x10, x1, x1

# Bitwise Logical operations
addi x11, x0, 85
addi x12, x0, 170
and  x13, x11, x12
or   x14, x11, x12
xor  x15, x11, x12
andi x16, x11, 15
ori  x17, x11, 32
xori x18, x11, 85

# Comparison operations (SLT, SLTU, SLTI, SLTIU)
slt   x19, x1, x2
slt   x20, x2, x1
slt   x21, x3, x1
sltu  x22, x3, x1
sltu  x23, x1, x3
slti  x24, x3, 0
slti  x25, x1, 10
sltiu x26, x1, 20
sltiu x27, x3, 20
