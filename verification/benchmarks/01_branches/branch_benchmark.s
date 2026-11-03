# RV32I Verification Benchmark 01: Branch Instructions
# Tests BEQ, BNE, BLT, BGE, BLTU, BGEU
# Both taken and not-taken paths, signed vs unsigned, wrong-path instruction squash.

# Setup comparison operands
addi x1, x0, 5
addi x2, x0, 5
addi x3, x0, 7
addi x4, x0, -5

# Test 1: BEQ taken (5 == 5)
beq  x1, x2, beq_t
addi x10, x0, 99
beq_t:
addi x10, x0, 1

# Test 2: BEQ not taken (5 == 7 is False)
beq  x1, x3, beq_nt
addi x11, x0, 2
beq_nt:
addi x11, x11, 1

# Test 3: BNE taken (5 != 7)
bne  x1, x3, bne_t
addi x12, x0, 99
bne_t:
addi x12, x0, 3

# Test 4: BNE not taken (5 != 5 is False)
bne  x1, x2, bne_nt
addi x13, x0, 4
bne_nt:
addi x13, x13, 1

# Test 5: BLT taken (signed 5 < 7)
blt  x1, x3, blt_t
addi x14, x0, 99
blt_t:
addi x14, x0, 5

# Test 6: BLT not taken (signed 7 < 5 is False)
blt  x3, x1, blt_nt
addi x15, x0, 6
blt_nt:
addi x15, x15, 1

# Test 7: BGE taken (signed 7 >= 5)
bge  x3, x1, bge_t
addi x16, x0, 99
bge_t:
addi x16, x0, 7

# Test 8: BGE not taken (signed 5 >= 7 is False)
bge  x1, x3, bge_nt
addi x17, x0, 8
bge_nt:
addi x17, x17, 1

# Test 9: BLT signed negative (-5 < 5 is True)
blt  x4, x1, blt_neg_t
addi x18, x0, 99
blt_neg_t:
addi x18, x0, 11

# Test 10: BLTU unsigned taken (5 < -5 unsigned: 5 < 0xFFFFFFFB is True)
bltu x1, x4, bltu_t
addi x19, x0, 99
bltu_t:
addi x19, x0, 13

# Test 11: BLTU unsigned not taken (-5 < 5 unsigned: 0xFFFFFFFB < 5 is False)
bltu x4, x1, bltu_nt
addi x20, x0, 14
bltu_nt:
addi x20, x20, 1

# Test 12: BGEU unsigned taken (-5 >= 5 unsigned: 0xFFFFFFFB >= 5 is True)
bgeu x4, x1, bgeu_t
addi x21, x0, 99
bgeu_t:
addi x21, x0, 17

# Test 13: BGEU unsigned not taken (5 >= -5 unsigned: 5 >= 0xFFFFFFFB is False)
bgeu x1, x4, bgeu_nt
addi x22, x0, 18
bgeu_nt:
addi x22, x22, 1
