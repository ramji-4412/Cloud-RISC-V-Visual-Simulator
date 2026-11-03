`timescale 1ns/1ps

module tb_mux3;

    // 32-bit MUX signals
    logic [31:0] in0_32, in1_32, in2_32;
    logic [1:0] sel_32;
    logic [31:0] out_32;

    // 5-bit MUX signals
    logic [4:0] in0_5, in1_5, in2_5;
    logic [1:0] sel_5;
    logic [4:0] out_5;

    int pass_count = 0;
    int fail_count = 0;

    // 32-bit MUX instance
    mux3 #(
        .WIDTH(32)
    ) mux_32 (
        .in0(in0_32),
        .in1(in1_32),
        .in2(in2_32),
        .sel(sel_32),
        .out(out_32)
    );

    // 5-bit MUX instance
    mux3 #(
        .WIDTH(5)
    ) mux_5 (
        .in0(in0_5),
        .in1(in1_5),
        .in2(in2_5),
        .sel(sel_5),
        .out(out_5)
    );

    // Self-checking task
    task automatic check_output(
        input logic [31:0] expected_32,
        input logic [4:0] expected_5
    );

        begin

            if ((out_32 === expected_32) &&
                (out_5 === expected_5)) begin

                $display("PASS");
                pass_count++;

            end
            else begin

                $display("FAIL");

                $display("32-bit Actual:   %h", out_32);
                $display("32-bit Expected: %h", expected_32);

                $display("5-bit Actual:   %b", out_5);
                $display("5-bit Expected: %b", expected_5);

                fail_count++;

            end

        end

    endtask

    initial begin

        $dumpfile("mux3.vcd");
        $dumpvars(0, tb_mux3);

        // Initialize inputs
        in0_32 = 32'h11111111;
        in1_32 = 32'h22222222;
        in2_32 = 32'h33333333;

        in0_5 = 5'b00001;
        in1_5 = 5'b00010;
        in2_5 = 5'b00011;

        // Test 1: Select IN0
        sel_32 = 2'b00;
        sel_5 = 2'b00;

        #1;
        check_output(32'h11111111, 5'b00001);


        // Test 2: Select IN1
        sel_32 = 2'b01;
        sel_5 = 2'b01;

        #1;
        check_output(32'h22222222, 5'b00010);


        // Test 3: Select IN2
        sel_32 = 2'b10;
        sel_5 = 2'b10;

        #1;
        check_output(32'h33333333, 5'b00011);


        // Test 4: Invalid selection
        sel_32 = 2'b11;
        sel_5 = 2'b11;

        #1;
        check_output(32'h00000000, 5'b00000);


        // Test 5: Maximum values
        in0_32 = 32'hFFFFFFFF;
        in1_32 = 32'hAAAAAAAA;
        in2_32 = 32'h55555555;

        in0_5 = 5'b11111;
        in1_5 = 5'b10101;
        in2_5 = 5'b01010;

        sel_32 = 2'b00;
        sel_5 = 2'b00;

        #1;
        check_output(32'hFFFFFFFF, 5'b11111);


        // Test 6: Select IN1 with new values
        sel_32 = 2'b01;
        sel_5 = 2'b01;

        #1;
        check_output(32'hAAAAAAAA, 5'b10101);


        // Test 7: Select IN2 with new values
        sel_32 = 2'b10;
        sel_5 = 2'b10;

        #1;
        check_output(32'h55555555, 5'b01010);


        // Test 8: Change selection dynamically
        sel_32 = 2'b11;
        sel_5 = 2'b00;

        #1;
        check_output(32'h00000000, 5'b11111);


        // Summary
        $display("\n-----------------------------");
        $display("MUX3 TEST SUMMARY");
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
