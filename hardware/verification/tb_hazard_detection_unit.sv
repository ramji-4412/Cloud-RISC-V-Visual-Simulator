`timescale 1ns/1ps

module tb_hazard_detection_unit;

    logic [4:0] rs1_id;
    logic [4:0] rs2_id;
    logic [4:0] rd_ex;

    logic memread_ex;

    logic pc_write;
    logic if_id_write;
    logic control_stall;

    int pass_count = 0;
    int fail_count = 0;

    hazard_detection_unit dut (.*);

    // Self-checking task
    task automatic check_output(
        input logic expected_pc_write,
        input logic expected_if_id_write,
        input logic expected_control_stall
    );

        begin

            if ((pc_write === expected_pc_write) &&
                (if_id_write === expected_if_id_write) &&
                (control_stall === expected_control_stall)) begin

                $display("PASS");
                pass_count++;

            end
            else begin

                $display("FAIL");

                $display("Actual:   PC=%b IF_ID=%b STALL=%b",
                         pc_write, if_id_write, control_stall);

                $display("Expected: PC=%b IF_ID=%b STALL=%b",
                         expected_pc_write,
                         expected_if_id_write,
                         expected_control_stall);

                fail_count++;

            end

        end

    endtask

    initial begin

        $dumpfile("hazard_detection_unit.vcd");
        $dumpvars(0, tb_hazard_detection_unit);

        // Test 1: No hazard
        rs1_id = 5'd1;
        rs2_id = 5'd2;
        rd_ex = 5'd3;
        memread_ex = 1;

        #1;
        check_output(1, 1, 0);


        // Test 2: Hazard through rs1
        rs1_id = 5'd5;
        rs2_id = 5'd2;
        rd_ex = 5'd5;
        memread_ex = 1;

        #1;
        check_output(0, 0, 1);


        // Test 3: Hazard through rs2
        rs1_id = 5'd1;
        rs2_id = 5'd6;
        rd_ex = 5'd6;
        memread_ex = 1;

        #1;
        check_output(0, 0, 1);


        // Test 4: Hazard through both source registers
        rs1_id = 5'd7;
        rs2_id = 5'd7;
        rd_ex = 5'd7;
        memread_ex = 1;

        #1;
        check_output(0, 0, 1);


        // Test 5: No hazard when instruction is not a load
        rs1_id = 5'd8;
        rs2_id = 5'd2;
        rd_ex = 5'd8;
        memread_ex = 0;

        #1;
        check_output(1, 1, 0);


        // Test 6: Ignore destination register x0
        rs1_id = 5'd0;
        rs2_id = 5'd2;
        rd_ex = 5'd0;
        memread_ex = 1;

        #1;
        check_output(1, 1, 0);


        // Test 7: Source registers do not match
        rs1_id = 5'd9;
        rs2_id = 5'd10;
        rd_ex = 5'd11;
        memread_ex = 1;

        #1;
        check_output(1, 1, 0);


        // Test 8: Hazard involving x31
        rs1_id = 5'd31;
        rs2_id = 5'd4;
        rd_ex = 5'd31;
        memread_ex = 1;

        #1;
        check_output(0, 0, 1);


        // Test 9: Both source registers are x0
        rs1_id = 5'd0;
        rs2_id = 5'd0;
        rd_ex = 5'd5;
        memread_ex = 1;

        #1;
        check_output(1, 1, 0);


        // Summary
        $display("\n--------------------------------");
        $display("HAZARD DETECTION UNIT TEST SUMMARY");
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
