
module tb_fetch_stage;

    logic clk;
    logic rst_n;
    logic pc_enable;
    logic [31:0] pc_next;

    logic [31:0] fetch_pc;
    logic [31:0] fetch_pc_plus4;
    logic [31:0] fetch_instruction;

    int pass_count = 0;
    int fail_count = 0;

    // DUT
    fetch_stage #(
        .ADDR_WIDTH(4)
    ) dut (.*);

    // Clock generation
    always #5 clk = ~clk;

    // Self-checking task
    task automatic check_output(
        input logic [31:0] expected_pc,
        input logic [31:0] expected_pc4,
        input logic [31:0] expected_instruction
    );
        begin
            #1;

            if ((fetch_pc === expected_pc) &&
                (fetch_pc_plus4 === expected_pc4) &&
                (fetch_instruction === expected_instruction)) begin

                $display("PASS: PC=%h | PC+4=%h | Instruction=%h",
                         fetch_pc, fetch_pc_plus4, fetch_instruction);
                pass_count++;
            end
            else begin
                $display("FAIL");
                $display("PC: Expected=%h Actual=%h",
                         expected_pc, fetch_pc);
                $display("PC+4: Expected=%h Actual=%h",
                         expected_pc4, fetch_pc_plus4);
                $display("Instruction: Expected=%h Actual=%h",
                         expected_instruction, fetch_instruction);
                fail_count++;
            end
        end
    endtask

    initial begin

        $dumpfile("fetch_stage.vcd");
        $dumpvars(0, tb_fetch_stage);

        clk = 0;
        rst_n = 0;
        pc_enable = 0;
        pc_next = 0;

        // Initialize instruction memory
        dut.instruction_mem.memory[0] = 32'h00500093;
        dut.instruction_mem.memory[1] = 32'h00A00113;
        dut.instruction_mem.memory[2] = 32'h002081B3;
        dut.instruction_mem.memory[3] = 32'h00302023;

        $display("Starting IF Stage Testbench");

        // Test 1: Reset PC
        @(posedge clk);
        #1;
        rst_n = 1;
        check_output(
            32'h00000000,
            32'h00000004,
            32'h00500093
        );

        // Test 2: Advance to next instruction
        @(negedge clk);
        pc_enable = 1;
        pc_next = 32'h00000004;

        @(posedge clk);
        check_output(
            32'h00000004,
            32'h00000008,
            32'h00A00113
        );

        // Test 3: Advance again
        @(negedge clk);
        pc_next = 32'h00000008;

        @(posedge clk);
        check_output(
            32'h00000008,
            32'h0000000C,
            32'h002081B3
        );

        // Test 4: Hold PC
        @(negedge clk);
        pc_enable = 0;
        pc_next = 32'h0000000C;

        @(posedge clk);
        check_output(
            32'h00000008,
            32'h0000000C,
            32'h002081B3
        );

        // Test 5: Jump to another address
        @(negedge clk);
        pc_enable = 1;
        pc_next = 32'h0000000C;

        @(posedge clk);
        check_output(
            32'h0000000C,
            32'h00000010,
            32'h00302023
        );

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
