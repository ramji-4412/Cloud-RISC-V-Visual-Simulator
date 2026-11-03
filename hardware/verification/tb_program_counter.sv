module tb_program_counter;

    logic clk;
    logic rst_n;
    logic pc_enable;
    logic [31:0] pc_next;
    logic [31:0] pc_current;

    integer pass_count = 0;
    integer fail_count = 0;

    program_counter dut (.*);

    always #5 clk = ~clk;

    task automatic check_output(
        input logic [31:0] expected_pc,
        input string test_name
    );
    begin
        #1;
        if (pc_current === expected_pc) begin
            $display("PASS: %s", test_name);
            pass_count++;
        end
        else begin
            $display("FAIL: %s | Expected=%h Actual=%h",
                     test_name, expected_pc, pc_current);
            fail_count++;
        end
    end
    endtask

    initial begin
        clk = 0;
        rst_n = 0;
        pc_enable = 0;
        pc_next = 0;

        $dumpfile("program_counter.vcd");
        $dumpvars(0, tb_program_counter);

        // Test 1: Reset
        @(posedge clk);
        check_output(32'h00000000, "Synchronous reset");

        // Test 2: Load first address
        @(negedge clk);
        rst_n = 1;
        pc_enable = 1;
        pc_next = 32'h00000004;

        @(posedge clk);
        check_output(32'h00000004, "Load PC = 4");

        // Test 3: Load another address
        @(negedge clk);
        pc_next = 32'h00000008;

        @(posedge clk);
        check_output(32'h00000008, "Load PC = 8");

        // Test 4: Hold PC when disabled
        @(negedge clk);
        pc_enable = 0;
        pc_next = 32'h0000000C;

        @(posedge clk);
        check_output(32'h00000008, "Hold PC when disabled");

        // Test 5: Resume PC update
        @(negedge clk);
        pc_enable = 1;
        pc_next = 32'h00000010;

        @(posedge clk);
        check_output(32'h00000010, "Resume PC update");

        // Test 6: Load a non-sequential address
        @(negedge clk);
        pc_next = 32'h00000100;

        @(posedge clk);
        check_output(32'h00000100, "Load branch target");

        // Summary
        $display("\n-------------------------------");
        $display("PROGRAM COUNTER TEST SUMMARY");
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
