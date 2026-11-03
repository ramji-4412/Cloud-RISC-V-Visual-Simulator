module tb_if_id_reg;

    logic clk;
    logic rst_n;
    logic enable;
    logic flush;

    logic [31:0] pc_in;
    logic [31:0] pc_plus4_in;
    logic [31:0] instruction_in;

    logic [31:0] pc_out;
    logic [31:0] pc_plus4_out;
    logic [31:0] instruction_out;

    integer pass_count = 0;
    integer fail_count = 0;

    if_id_reg dut (.*);

    always #5 clk = ~clk;

    task automatic check_output(
        input logic [31:0] exp_pc,
        input logic [31:0] exp_pc_plus4,
        input logic [31:0] exp_instruction,
        input string test_name
    );
    begin
        #1;

        if ((pc_out === exp_pc) &&
            (pc_plus4_out === exp_pc_plus4) &&
            (instruction_out === exp_instruction)) begin

            $display("PASS: %s", test_name);
            pass_count++;
        end
        else begin
            $display("FAIL: %s", test_name);
            $display("Actual: PC=%h PC+4=%h INST=%h",
                     pc_out, pc_plus4_out, instruction_out);
            $display("Expected: PC=%h PC+4=%h INST=%h",
                     exp_pc, exp_pc_plus4, exp_instruction);
            fail_count++;
        end
    end
    endtask

    initial begin

        clk = 0;
        rst_n = 0;
        enable = 0;
        flush = 0;

        pc_in = 0;
        pc_plus4_in = 0;
        instruction_in = 0;

        $dumpfile("if_id_reg.vcd");
        $dumpvars(0, tb_if_id_reg);

        // Test 1: Reset
        @(posedge clk);
        check_output(
            32'h0, 32'h0, 32'h00000013,
            "Reset"
        );

        // Test 2: Normal data transfer
        @(negedge clk);
        rst_n = 1;
        enable = 1;

        pc_in = 32'h1000;
        pc_plus4_in = 32'h1004;
        instruction_in = 32'h002081B3;

        @(posedge clk);
        check_output(
            32'h1000, 32'h1004, 32'h002081B3,
            "Normal transfer"
        );

        // Test 3: Stall / hold
        @(negedge clk);
        enable = 0;

        pc_in = 32'h2000;
        pc_plus4_in = 32'h2004;
        instruction_in = 32'h00310233;

        @(posedge clk);
        check_output(
            32'h1000, 32'h1004, 32'h002081B3,
            "Stall holds previous values"
        );

        // Test 4: Resume after stall
        @(negedge clk);
        enable = 1;

        @(posedge clk);
        check_output(
            32'h2000, 32'h2004, 32'h00310233,
            "Resume after stall"
        );

        // Test 5: Flush
        @(negedge clk);
        flush = 1;

        @(posedge clk);
        check_output(
            32'h0, 32'h0, 32'h00000013,
            "Flush inserts NOP"
        );

        // Test 6: Flush has priority over enable
        @(negedge clk);
        enable = 1;
        pc_in = 32'h3000;
        pc_plus4_in = 32'h3004;
        instruction_in = 32'h004182B3;

        @(posedge clk);
        check_output(
            32'h0, 32'h0, 32'h00000013,
            "Flush priority over enable"
        );

        // Test 7: Reset has priority over everything
        @(negedge clk);
        rst_n = 0;
        flush = 0;
        enable = 1;

        @(posedge clk);
        check_output(
            32'h0, 32'h0, 32'h00000013,
            "Reset priority"
        );

        $display("\n-------------------------------");
        $display("IF/ID REGISTER TEST SUMMARY");
        $display("-------------------------------");
        $display("Passed: %0d", pass_count);
        $display("Failed: %0d", fail_count);
        $display("-------------------------------");

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");
        else
            $display("SOME TESTS FAILED!");

        $finish;
    end

endmodule
