
`timescale 1ns/1ps

module tb_pipeline_cpu;

    logic clk;
    logic rst_n;

    int pass_count = 0;
    int fail_count = 0;
    int stall_count = 0;

    // DUT
    pipeline_cpu dut (
        .clk(clk),
        .rst_n(rst_n)
    );

    // Clock: 10 ns period
    initial begin
        clk = 1'b0;
        forever #5 clk = ~clk;
    end

    // Count load-use stalls
    always @(posedge clk) begin
        if (rst_n && dut.control_stall)
            stall_count <= stall_count + 1;
    end

    // Self-checking task
    task automatic check(
        input logic condition,
        input string test_name
    );
        begin
            if (condition === 1'b1) begin
                $display("PASS: %s", test_name);
                pass_count++;
            end
            else begin
                $display("FAIL: %s", test_name);
                fail_count++;
            end
        end
    endtask

    initial begin

        $dumpfile("pipeline_cpu.vcd");
        $dumpvars(0, tb_pipeline_cpu);

        // -----------------------------------------
        // Initialize instruction memory with NOPs
        // -----------------------------------------

        for (int i = 0; i < 1024; i++) begin
            dut.fetch_unit.instruction_mem.memory[i] =
                32'h00000013;
        end

        // -----------------------------------------
        // Initialize register file
        // -----------------------------------------

        for (int i = 0; i < 32; i++) begin
            dut.decode_unit.register_file.registers[i] = 32'b0;
        end

        // -----------------------------------------
        // Initialize data memory
        // -----------------------------------------

        for (int i = 0; i < 1024; i++) begin
            dut.memory_unit.data_mem.memory[i] = 32'b0;
        end

        // -----------------------------------------
        // Load test program
        // -----------------------------------------

        // Address 0x00: ADDI x1, x0, 5
        dut.fetch_unit.instruction_mem.memory[0] =
            32'h00500093;

        // Address 0x04: ADDI x2, x0, 7
        dut.fetch_unit.instruction_mem.memory[1] =
            32'h00700113;

        // Address 0x08: ADD x3, x1, x2
        dut.fetch_unit.instruction_mem.memory[2] =
            32'h002081B3;

        // Address 0x0C: SW x3, 0(x0)
        dut.fetch_unit.instruction_mem.memory[3] =
            32'h00302023;

        // Address 0x10: LW x4, 0(x0)
        dut.fetch_unit.instruction_mem.memory[4] =
            32'h00002203;

        // Address 0x14: ADDI x5, x4, 1
        dut.fetch_unit.instruction_mem.memory[5] =
            32'h00120293;

        // -----------------------------------------
        // Reset
        // -----------------------------------------

        rst_n = 1'b0;

        repeat (2) @(posedge clk);

        @(negedge clk);
        rst_n = 1'b1;

        // Allow the pipeline to complete the program
        repeat (25) @(posedge clk);

        #2;

        // -----------------------------------------
        // Architectural result checks
        // -----------------------------------------

        check(
            dut.decode_unit.register_file.registers[1] === 32'd5,
            "ADDI: x1 = 5"
        );

        check(
            dut.decode_unit.register_file.registers[2] === 32'd7,
            "ADDI: x2 = 7"
        );

        check(
            dut.decode_unit.register_file.registers[3] === 32'd12,
            "ADD with forwarding: x3 = 12"
        );

        check(
            dut.memory_unit.data_mem.memory[0] === 32'd12,
            "SW: memory[0] = 12"
        );

        check(
            dut.decode_unit.register_file.registers[4] === 32'd12,
            "LW: x4 = 12"
        );

        check(
            dut.decode_unit.register_file.registers[5] === 32'd13,
            "ADDI after LW: x5 = 13"
        );

        // -----------------------------------------
        // Hazard verification
        // -----------------------------------------

        check(
            stall_count >= 1,
            "Load-use hazard detected and pipeline stalled"
        );

        // -----------------------------------------
        // Summary
        // -----------------------------------------

        $display("\n====================================");
        $display("PIPELINE CPU TEST SUMMARY");
        $display("====================================");
        $display("Passed       : %0d", pass_count);
        $display("Failed       : %0d", fail_count);
        $display("Total        : %0d", pass_count + fail_count);
        $display("Stall cycles : %0d", stall_count);
        $display("====================================");

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");
        else
            $display("SOME TESTS FAILED!");

        $finish;

    end

endmodule
