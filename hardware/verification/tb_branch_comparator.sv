`timescale 1ns/1ps

module tb_branch_comparator;

    logic [31:0] rs1_data;
    logic [31:0] rs2_data;
    logic [2:0] funct3;

    logic branch_taken;

    int pass_count = 0;
    int fail_count = 0;

    branch_comparator dut (.*);

    // Self-checking task
    task automatic check_output(
        input logic expected
    );

        begin

            if (branch_taken === expected) begin
                $display("PASS");
                pass_count++;
            end
            else begin
                $display("FAIL");
                $display("Actual:   %b", branch_taken);
                $display("Expected: %b", expected);
                fail_count++;
            end

        end

    endtask

    initial begin

        $dumpfile("branch_comparator.vcd");
        $dumpvars(0, tb_branch_comparator);

        // Test 1: BEQ - Equal
        rs1_data = 32'd10;
        rs2_data = 32'd10;
        funct3 = 3'b000;

        #1;
        check_output(1'b1);


        // Test 2: BEQ - Not Equal
        rs1_data = 32'd10;
        rs2_data = 32'd20;
        funct3 = 3'b000;

        #1;
        check_output(1'b0);


        // Test 3: BNE - Not Equal
        rs1_data = 32'd10;
        rs2_data = 32'd20;
        funct3 = 3'b001;

        #1;
        check_output(1'b1);


        // Test 4: BNE - Equal
        rs1_data = 32'd10;
        rs2_data = 32'd10;
        funct3 = 3'b001;

        #1;
        check_output(1'b0);


        // Test 5: BLT - Signed comparison
        rs1_data = 32'hFFFFFFFF; // -1
        rs2_data = 32'h00000001; // +1
        funct3 = 3'b100;

        #1;
        check_output(1'b1);


        // Test 6: BGE - Signed comparison
        rs1_data = 32'h00000001; // +1
        rs2_data = 32'hFFFFFFFF; // -1
        funct3 = 3'b101;

        #1;
        check_output(1'b1);


        // Test 7: BLTU - Unsigned comparison
        rs1_data = 32'hFFFFFFFF;
        rs2_data = 32'h00000001;
        funct3 = 3'b110;

        #1;
        check_output(1'b0);


        // Test 8: BGEU - Unsigned comparison
        rs1_data = 32'hFFFFFFFF;
        rs2_data = 32'h00000001;
        funct3 = 3'b111;

        #1;
        check_output(1'b1);


        // Test 9: BLT - Positive numbers
        rs1_data = 32'd5;
        rs2_data = 32'd10;
        funct3 = 3'b100;

        #1;
        check_output(1'b1);


        // Test 10: BGE - Equal values
        rs1_data = 32'd15;
        rs2_data = 32'd15;
        funct3 = 3'b101;

        #1;
        check_output(1'b1);


        // Test 11: BLTU - Zero versus maximum unsigned
        rs1_data = 32'h00000000;
        rs2_data = 32'hFFFFFFFF;
        funct3 = 3'b110;

        #1;
        check_output(1'b1);


        // Test 12: Unsupported funct3
        rs1_data = 32'd10;
        rs2_data = 32'd10;
        funct3 = 3'b010;

        #1;
        check_output(1'b0);


        // Summary
        $display("\n--------------------------------");
        $display("BRANCH COMPARATOR TEST SUMMARY");
        $display("--------------------------------");

        $display("Passed: %0d", pass_count);
        $display("Failed: %0d", fail_count);

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");
        else
            $display("SOME TESTS FAILED!");

        $finish;

    end

endmodule
