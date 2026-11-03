
module tb_writeback_mux;

    logic [31:0] alu_result;
    logic [31:0] mem_read_data;
    logic [31:0] pc_plus4;
    logic [1:0] result_src;
    logic [31:0] writeback_data;

    int pass_count = 0;
    int fail_count = 0;

    // DUT
    writeback_mux dut (.*);

    // Self-checking task
    task automatic check_output(input logic [31:0] expected);
        begin
            #1;

            if (writeback_data === expected) begin
                $display("PASS: ResultSrc=%b | Output=%h",
                         result_src, writeback_data);
                pass_count++;
            end
            else begin
                $display("FAIL: ResultSrc=%b | Expected=%h | Actual=%h",
                         result_src, expected, writeback_data);
                fail_count++;
            end
        end
    endtask

    initial begin

        $dumpfile("writeback_mux.vcd");
        $dumpvars(0, tb_writeback_mux);

        $display("Starting Write-Back MUX Testbench");

        alu_result    = 32'h12345678;
        mem_read_data = 32'hAABBCCDD;
        pc_plus4      = 32'h00001004;

        // Test 1: Select ALU result
        result_src = 2'b00;
        check_output(32'h12345678);

        // Test 2: Select memory data
        result_src = 2'b01;
        check_output(32'hAABBCCDD);

        // Test 3: Select PC + 4
        result_src = 2'b10;
        check_output(32'h00001004);

        // Test 4: Invalid selection
        result_src = 2'b11;
        check_output(32'h00000000);

        // Change values and verify again

        alu_result = 32'hFFFFFFFF;
        mem_read_data = 32'h00000055;
        pc_plus4 = 32'h00002004;

        // Test 5
        result_src = 2'b00;
        check_output(32'hFFFFFFFF);

        // Test 6
        result_src = 2'b01;
        check_output(32'h00000055);

        // Test 7
        result_src = 2'b10;
        check_output(32'h00002004);

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
