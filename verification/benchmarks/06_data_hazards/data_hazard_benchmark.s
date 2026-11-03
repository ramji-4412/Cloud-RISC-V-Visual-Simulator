# RV32I Verification Benchmark 06: Data Hazards and Forwarding
# Tests EX/MEM -> EX forwarding, MEM/WB -> EX forwarding, double operand forwarding,
# forwarding priority, back-to-back dependency chains, and load-use hazard stalls.

# Test 1: Distance 1 hazard (EX/MEM -> EX forwarding)
addi x1, x0, 10
addi x2, x1, 5

# Test 2: Distance 2 hazard (MEM/WB -> EX forwarding)
addi x3, x0, 20
addi x0, x0, 0
addi x4, x3, 5

# Test 3: Double operand forwarding
addi x5, x0, 30
addi x6, x0, 40
add  x7, x5, x6

# Test 4: Forwarding priority (EX/MEM overrides MEM/WB for same register)
addi x8, x0, 100
addi x8, x0, 200
add  x9, x8, x0

# Test 5: Consecutive back-to-back dependent chain
addi x10, x0, 1
add  x11, x10, x10
add  x12, x11, x11
add  x13, x12, x12
add  x14, x13, x13

# Test 6: Load-use data hazard with hardware bubble insertion
addi x15, x0, 0
addi x16, x0, 888
sw   x16, 0(x15)
lw   x17, 0(x15)
add  x18, x17, x10
add  x19, x18, x17
