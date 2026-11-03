
module tb_pc_select_control;

    logic branch;
    logic branch_taken;
    logic jump;
    logic jalr;

    logic [1:0] pc_sel;

    int pass_count = 0;
    int fail_count = 0;

    // DUT
    pc_select_control dut (.*);

    // Self-checking task
    task automatic check_output(input logic [1:0] expected);
        begin
            #1;

            if (pc_sel === expected) begin
                $display("PASS: branch=%b branch_taken=%b jump=%b jalr=%b | pc_sel=%b",
                         branch, branch_taken, jump, jalr, pc_sel);
                pass_count++;
            end
            else begin
                $display("FAIL: Expected=%b | Actual=%b",
                         expected, pc_sel);
                fail_count++;
            end
        end
    endtask

    initial begin

        $dumpfile("pc_select_control.vcd");
        $dumpvars(0, tb_pc_select_control);

        $display("Starting PC Selection Control Testbench");

        // Test 1: Normal execution
        branch = 0;
        branch_taken = 0;
        jump = 0;
        jalr = 0;
        check_output(2'b00);

        // Test 2: Branch taken
        branch = 1;
        branch_taken = 1;
        jump = 0;
        jalr = 0;
        check_output(2'b01);

        // Test 3: Branch not taken
        branch = 1;
        branch_taken = 0;
        jump = 0;
        jalr = 0;
        check_output(2'b00);

        // Test 4: JAL
        branch = 0;
        branch_taken = 0;
        jump = 1;
        jalr = 0;
        check_output(2'b10);

        // Test 5: JALR
        branch = 0;
        branch_taken = 0;
        jump = 1;
        jalr = 1;
        check_output(2'b11);

        // Test 6: Jump overrides branch
        branch = 1;
        branch_taken = 1;
        jump = 1;
        jalr = 0;
        check_output(2'b10);

        // Test 7: JALR overrides branch
        branch = 1;
        branch_taken = 1;
        jump = 1;
        jalr = 1;
        check_output(2'b11);

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
