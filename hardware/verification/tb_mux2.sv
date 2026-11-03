`timescale 1ns/1ps

module tb_mux2;

    // 32-bit MUX signals
    logic [31:0] in0_32;
    logic [31:0] in1_32;
    logic sel_32;
    logic [31:0] out_32;

    // 5-bit MUX signals
    logic [4:0] in0_5;
    logic [4:0] in1_5;
    logic sel_5;
    logic [4:0] out_5;

    int pass_count = 0;
    int fail_count = 0;

    // 32-bit MUX instance
    mux2 #(
        .WIDTH(32)
    ) mux_32 (
        .in0(in0_32),
        .in1(in1_32),
        .sel(sel_32),
        .out(out_32)
    );

    // 5-bit MUX instance
    mux2 #(
        .WIDTH(5)
    ) mux_5 (
        .in0(in0_5),
        .in1(in1_5),
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

        $dumpfile("mux2.vcd");
        $dumpvars(0, tb_mux2);

        // Test 1: Select in0
        in0_32 = 32'h12345678;
        in1_32 = 32'hABCDEF12;
        sel_32 = 0;

        in0_5 = 5'b10101;
        in1_5 = 5'b01010;
        sel_5 = 0;

        #1;
        check_output(32'h12345678, 5'b10101);


        // Test 2: Select in1
        sel_32 = 1;
        sel_5 = 1;

        #1;
        check_output(32'hABCDEF12, 5'b01010);


        // Test 3: Select zero from in0
        in0_32 = 32'h00000000;
        in1_32 = 32'hFFFFFFFF;

        in0_5 = 5'b00000;
        in1_5 = 5'b11111;

        sel_32 = 0;
        sel_5 = 0;

        #1;
        check_output(32'h00000000, 5'b00000);


        // Test 4: Select maximum value from in1
        sel_32 = 1;
        sel_5 = 1;

        #1;
        check_output(32'hFFFFFFFF, 5'b11111);


        // Test 5: Select alternating bit pattern from in0
        in0_32 = 32'hAAAAAAAA;
        in1_32 = 32'h55555555;

        in0_5 = 5'b10101;
        in1_5 = 5'b01010;

        sel_32 = 0;
        sel_5 = 0;

        #1;
        check_output(32'hAAAAAAAA, 5'b10101);


        // Test 6: Select alternating bit pattern from in1
        sel_32 = 1;
        sel_5 = 1;

        #1;
        check_output(32'h55555555, 5'b01010);


        // Test 7: Both inputs contain the same value
        in0_32 = 32'hDEADBEEF;
        in1_32 = 32'hDEADBEEF;

        in0_5 = 5'b11011;
        in1_5 = 5'b11011;

        sel_32 = 0;
        sel_5 = 1;

        #1;
        check_output(32'hDEADBEEF, 5'b11011);


        // Test 8: Change selection dynamically
        sel_32 = 1;
        sel_5 = 0;

        #1;
        check_output(32'hDEADBEEF, 5'b11011);


        // Summary
        $display("\n-----------------------------");
        $display("MUX2 TEST SUMMARY");
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
