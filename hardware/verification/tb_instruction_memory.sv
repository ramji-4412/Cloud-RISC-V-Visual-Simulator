
module tb_instruction_memory;

    logic [31:0] pc;
    logic [31:0] instruction;

    int pass_count = 0;
    int fail_count = 0;

    // DUT
    instruction_memory #(
        .ADDR_WIDTH(4)
    ) dut (
        .pc(pc),
        .instruction(instruction)
    );

    // Self-checking task
    task automatic check_output(
        input logic [31:0] expected
    );
        begin
            #1;

            if (instruction === expected) begin
                $display("PASS: PC=%h | Instruction=%h",
                         pc, instruction);
                pass_count++;
            end
            else begin
                $display("FAIL: PC=%h | Expected=%h | Actual=%h",
                         pc, expected, instruction);
                fail_count++;
            end
        end
    endtask

    initial begin

        $dumpfile("instruction_memory.vcd");
        $dumpvars(0, tb_instruction_memory);

        $display("Starting Instruction Memory Testbench");

        // Initialize instruction memory
        dut.memory[0] = 32'h00500093;
        dut.memory[1] = 32'h00A00113;
        dut.memory[2] = 32'h002081B3;
        dut.memory[3] = 32'h00302023;

        // Test 1: First instruction
        pc = 32'h00000000;
        check_output(32'h00500093);

        // Test 2: Second instruction
        pc = 32'h00000004;
        check_output(32'h00A00113);

        // Test 3: Third instruction
        pc = 32'h00000008;
        check_output(32'h002081B3);

        // Test 4: Fourth instruction
        pc = 32'h0000000C;
        check_output(32'h00302023);

        // Test 5: Return to first instruction
        pc = 32'h00000000;
        check_output(32'h00500093);

        // Test 6: Misaligned PC
        pc = 32'h00000002;
        check_output(32'h00000013);

        // Test 7: Another misaligned PC
        pc = 32'h00000005;
        check_output(32'h00000013);

        // Summary
        $display("--------------------------------");
        $display("Total Passed: %0d", pass_count);
        $display("Total Failed: %0d", fail_count);
        $display("--------------------------------");

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");
        else
            $display("SOME TESTS FAILED!");

        $finish;
    end

endmodule
