`timescale 1ns/1ps

module tb_forwarding_unit;

    logic [4:0] rs1_ex;
    logic [4:0] rs2_ex;

    logic [4:0] rd_mem;
    logic [4:0] rd_wb;

    logic regwrite_mem;
    logic regwrite_wb;

    logic [1:0] forward_a;
    logic [1:0] forward_b;

    int pass_count = 0;
    int fail_count = 0;

    forwarding_unit dut (.*);

    // Self-checking task
    task automatic check_output(
        input logic [1:0] expected_a,
        input logic [1:0] expected_b
    );

        begin

            if ((forward_a === expected_a) &&
                (forward_b === expected_b)) begin

                $display("PASS");
                pass_count++;

            end
            else begin

                $display("FAIL");
                $display("Actual:   A=%b B=%b",
                         forward_a, forward_b);
                $display("Expected: A=%b B=%b",
                         expected_a, expected_b);

                fail_count++;

            end

        end

    endtask

    initial begin

        $dumpfile("forwarding_unit.vcd");
        $dumpvars(0, tb_forwarding_unit);

        // Test 1: No hazard
        rs1_ex = 5'd1;
        rs2_ex = 5'd2;
        rd_mem = 5'd3;
        rd_wb  = 5'd4;

        regwrite_mem = 1;
        regwrite_wb  = 1;

        #1;
        check_output(2'b00, 2'b00);


        // Test 2: Forward operand A from EX/MEM
        rs1_ex = 5'd5;
        rs2_ex = 5'd2;
        rd_mem = 5'd5;
        rd_wb  = 5'd4;

        #1;
        check_output(2'b10, 2'b00);


        // Test 3: Forward operand B from EX/MEM
        rs1_ex = 5'd1;
        rs2_ex = 5'd6;
        rd_mem = 5'd6;
        rd_wb  = 5'd4;

        #1;
        check_output(2'b00, 2'b10);


        // Test 4: Forward both operands from EX/MEM
        rs1_ex = 5'd7;
        rs2_ex = 5'd8;
        rd_mem = 5'd7;
        rd_wb  = 5'd4;

        // Set both source registers to same destination
        rs2_ex = 5'd7;

        #1;
        check_output(2'b10, 2'b10);


        // Test 5: Forward operand A from MEM/WB
        rs1_ex = 5'd9;
        rs2_ex = 5'd2;
        rd_mem = 5'd3;
        rd_wb  = 5'd9;

        #1;
        check_output(2'b01, 2'b00);


        // Test 6: Forward operand B from MEM/WB
        rs1_ex = 5'd1;
        rs2_ex = 5'd10;
        rd_mem = 5'd3;
        rd_wb  = 5'd10;

        #1;
        check_output(2'b00, 2'b01);


        // Test 7: EX/MEM priority over MEM/WB
        rs1_ex = 5'd11;
        rs2_ex = 5'd12;

        rd_mem = 5'd11;
        rd_wb  = 5'd11;

        #1;
        check_output(2'b10, 2'b00);


        // Test 8: Ignore register x0
        rs1_ex = 5'd0;
        rs2_ex = 5'd0;

        rd_mem = 5'd0;
        rd_wb  = 5'd0;

        #1;
        check_output(2'b00, 2'b00);


        // Test 9: RegWrite disabled
        rs1_ex = 5'd13;
        rs2_ex = 5'd14;

        rd_mem = 5'd13;
        rd_wb  = 5'd14;

        regwrite_mem = 0;
        regwrite_wb  = 0;

        #1;
        check_output(2'b00, 2'b00);


        // Summary
        $display("\n-----------------------------");
        $display("FORWARDING UNIT TEST SUMMARY");
        $display("-----------------------------");

        $display("Passed: %0d", pass_count);
        $display("Failed: %0d", fail_count);

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");
        else
            $display("SOME TESTS FAILED!");

        $finish;

    end

endmodule
