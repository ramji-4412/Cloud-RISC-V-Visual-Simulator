
module tb_alu_src_b_mux;

    logic [31:0] rs2_data, imm;
    logic sel;
    logic [31:0] alu_operand_b;

    int pass_count = 0;
    int fail_count = 0;

    alu_src_b_mux dut (.*);

    task automatic check_output(input logic [31:0] expected);
        begin
            #1;
            if (alu_operand_b === expected) begin
                $display("PASS: sel=%b | Output=%h", sel, alu_operand_b);
                pass_count++;
            end
            else begin
                $display("FAIL: sel=%b | Expected=%h | Actual=%h",
                         sel, expected, alu_operand_b);
                fail_count++;
            end
        end
    endtask

    initial begin
        $dumpfile("alu_src_b_mux.vcd");
        $dumpvars(0, tb_alu_src_b_mux);

        rs2_data = 32'hABCDEF01;
        imm      = 32'h00000010;

        // Test 1: Register data
        sel = 1'b0;
        check_output(32'hABCDEF01);

        // Test 2: Immediate
        sel = 1'b1;
        check_output(32'h00000010);

        // Test 3: Change register data
        rs2_data = 32'h87654321;
        sel = 1'b0;
        check_output(32'h87654321);

        // Test 4: Change immediate
        imm = 32'hFFFFFFF0;
        sel = 1'b1;
        check_output(32'hFFFFFFF0);

        $display("------------------------------");
        $display("Passed: %0d | Failed: %0d",
                 pass_count, fail_count);

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");

        $finish;
    end

endmodule
