`timescale 1ns/1ps

module tb_mem_wb_reg;

    logic clk;
    logic rst_n;
    logic flush;
    logic enable;

    logic [31:0] alu_result_in;
    logic [31:0] mem_read_data_in;
    logic [31:0] pc_plus4_in;

    logic [4:0] rd_in;

    logic RegWrite_in;
    logic [1:0] ResultSrc_in;

    logic [31:0] alu_result_out;
    logic [31:0] mem_read_data_out;
    logic [31:0] pc_plus4_out;

    logic [4:0] rd_out;

    logic RegWrite_out;
    logic [1:0] ResultSrc_out;

    int pass_count = 0;
    int fail_count = 0;

    mem_wb_reg dut (
        .*
    );

    // Clock generation
    always #5 clk = ~clk;

    // Self-checking task
    task automatic check_output(
        input logic [101:0] expected
    );

        logic [101:0] actual;

        begin
            actual = {
                alu_result_out,
                mem_read_data_out,
                pc_plus4_out,
                rd_out,
                RegWrite_out,
                ResultSrc_out
            };

            if (actual === expected) begin
                $display("PASS");
                pass_count++;
            end
            else begin
                $display("FAIL");
                $display("Actual:   %h", actual);
                $display("Expected: %h", expected);
                fail_count++;
            end
        end

    endtask

    initial begin

        $dumpfile("mem_wb_reg.vcd");
        $dumpvars(0, tb_mem_wb_reg);

        clk = 0;
        rst_n = 1;
        flush = 0;
        enable = 0;

        alu_result_in = 0;
        mem_read_data_in = 0;
        pc_plus4_in = 0;
        rd_in = 0;
        RegWrite_in = 0;
        ResultSrc_in = 0;

        // Test 1: Reset
        rst_n = 0;
        @(posedge clk);
        #1;

        check_output(102'b0);

        rst_n = 1;

        // Test 2: Normal data transfer
        alu_result_in = 32'h12345678;
        mem_read_data_in = 32'hABCDEF12;
        pc_plus4_in = 32'h00001004;
        rd_in = 5'd10;
        RegWrite_in = 1;
        ResultSrc_in = 2'b00;

        enable = 1;

        @(posedge clk);
        #1;

        check_output({
            32'h12345678,
            32'hABCDEF12,
            32'h00001004,
            5'd10,
            1'b1,
            2'b00
        });

        // Test 3: Hold previous values
        enable = 0;

        alu_result_in = 32'hFFFFFFFF;
        mem_read_data_in = 32'hFFFFFFFF;
        pc_plus4_in = 32'hFFFFFFFF;
        rd_in = 5'd20;
        RegWrite_in = 0;
        ResultSrc_in = 2'b01;

        @(posedge clk);
        #1;

        check_output({
            32'h12345678,
            32'hABCDEF12,
            32'h00001004,
            5'd10,
            1'b1,
            2'b00
        });

        // Test 4: Flush
        flush = 1;

        @(posedge clk);
        #1;

        check_output(102'b0);

        flush = 0;

        // Test 5: ALU-result write-back selection
        alu_result_in = 32'h00000055;
        mem_read_data_in = 32'h000000AA;
        pc_plus4_in = 32'h00002004;
        rd_in = 5'd5;
        RegWrite_in = 1;
        ResultSrc_in = 2'b00;

        enable = 1;

        @(posedge clk);
        #1;

        check_output({
            32'h00000055,
            32'h000000AA,
            32'h00002004,
            5'd5,
            1'b1,
            2'b00
        });

        // Test 6: Memory-data write-back selection
        alu_result_in = 32'h00000011;
        mem_read_data_in = 32'h00000099;
        pc_plus4_in = 32'h00003004;
        rd_in = 5'd8;
        RegWrite_in = 1;
        ResultSrc_in = 2'b01;

        @(posedge clk);
        #1;

        check_output({
            32'h00000011,
            32'h00000099,
            32'h00003004,
            5'd8,
            1'b1,
            2'b01
        });

        // Test 7: Reset priority over flush and enable
        rst_n = 0;
        flush = 1;
        enable = 1;

        @(posedge clk);
        #1;

        check_output(102'b0);

        // Summary
        $display("\n-----------------------------");
        $display("MEM/WB REGISTER TEST SUMMARY");
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
