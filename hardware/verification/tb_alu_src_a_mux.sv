
module tb_alu_src_a_mux;

    logic [31:0] rs1_data, pc;
    logic [1:0] sel;
    logic [31:0] alu_operand_a;

    int pass_count = 0;
    int fail_count = 0;

    alu_src_a_mux dut (.*);

    task automatic check_output(input logic [31:0] expected);
        begin
            #1;
            if (alu_operand_a === expected) begin
                $display("PASS: sel=%b | Output=%h", sel, alu_operand_a);
                pass_count++;
            end
            else begin
                $display("FAIL: sel=%b | Expected=%h | Actual=%h",
                         sel, expected, alu_operand_a);
                fail_count++;
            end
        end
    endtask

    initial begin
        $dumpfile("alu_src_a_mux.vcd");
        $dumpvars(0, tb_alu_src_a_mux);

        rs1_data = 32'h12345678;
        pc       = 32'h00001000;

        // Test 1: Register data
        sel = 2'b00;
        check_output(32'h12345678);

        // Test 2: PC
        sel = 2'b01;
        check_output(32'h00001000);

        // Test 3: Zero
        sel = 2'b10;
        check_output(32'h00000000);

        // Test 4: Default selection
        sel = 2'b11;
        check_output(32'h00000000);

        $display("------------------------------");
        $display("Passed: %0d | Failed: %0d",
                 pass_count, fail_count);

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");

        $finish;
    end

endmodule
