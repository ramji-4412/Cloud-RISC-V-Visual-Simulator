
module tb_data_memory;

    logic clk;
    logic mem_read, mem_write;
    logic [31:0] address;
    logic [31:0] write_data;
    logic [31:0] read_data;

    int pass_count = 0;
    int fail_count = 0;

    // DUT
    data_memory #(
        .ADDR_WIDTH(4)
    ) dut (
        .clk(clk),
        .mem_read(mem_read),
        .mem_write(mem_write),
        .address(address),
        .write_data(write_data),
        .read_data(read_data)
    );

    // Clock generation
    always #5 clk = ~clk;

    // Self-checking task
    task automatic check_output(
        input logic [31:0] expected
    );
        begin
            #1;

            if (read_data === expected) begin
                $display("PASS: Address=%h | Read Data=%h",
                         address, read_data);
                pass_count++;
            end
            else begin
                $display("FAIL: Address=%h | Expected=%h | Actual=%h",
                         address, expected, read_data);
                fail_count++;
            end
        end
    endtask

    initial begin

        $dumpfile("data_memory.vcd");
        $dumpvars(0, tb_data_memory);

        clk = 0;
        mem_read = 0;
        mem_write = 0;
        address = 0;
        write_data = 0;

        $display("Starting Data Memory Testbench");

        // Initialize selected memory locations
        dut.memory[0] = 32'h00000000;
        dut.memory[1] = 32'h00000000;
        dut.memory[2] = 32'h00000000;

        // Test 1: Write data to address 0
        @(negedge clk);
        address = 32'h00000000;
        write_data = 32'h12345678;
        mem_write = 1;

        @(posedge clk);
        #1;
        mem_write = 0;

        // Test 2: Read data from address 0
        mem_read = 1;
        check_output(32'h12345678);

        // Test 3: Write data to address 4
        @(negedge clk);
        address = 32'h00000004;
        write_data = 32'hAABBCCDD;
        mem_write = 1;
        mem_read = 0;

        @(posedge clk);
        #1;
        mem_write = 0;

        // Test 4: Read data from address 4
        mem_read = 1;
        check_output(32'hAABBCCDD);

        // Test 5: Read address 0 again
        address = 32'h00000000;
        check_output(32'h12345678);

        // Test 6: Read disabled
        mem_read = 0;
        check_output(32'h00000000);

        // Test 7: Misaligned write must be ignored
        @(negedge clk);
        address = 32'h00000001;
        write_data = 32'hFFFFFFFF;
        mem_write = 1;

        @(posedge clk);
        #1;
        mem_write = 0;

        // Verify original word at address 0 remains unchanged
        address = 32'h00000000;
        mem_read = 1;
        check_output(32'h12345678);

        // Test 8: Misaligned read returns zero
        address = 32'h00000002;
        check_output(32'h00000000);

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
