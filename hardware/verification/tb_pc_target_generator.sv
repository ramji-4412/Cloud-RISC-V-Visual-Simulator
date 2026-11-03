
module tb_pc_target_generator;

    logic [31:0] pc;
    logic [31:0] rs1_data;
    logic [31:0] imm;

    logic [31:0] branch_target;
    logic [31:0] jal_target;
    logic [31:0] jalr_target;

    int pass_count = 0;
    int fail_count = 0;

    // DUT
    pc_target_generator dut (.*);

    // Check all three outputs
    task automatic check_output(
        input logic [31:0] expected_branch,
        input logic [31:0] expected_jal,
        input logic [31:0] expected_jalr
    );
        begin
            #1;

            if ((branch_target === expected_branch) &&
                (jal_target === expected_jal) &&
                (jalr_target === expected_jalr)) begin

                $display("PASS: Branch=%h | JAL=%h | JALR=%h",
                         branch_target, jal_target, jalr_target);
                pass_count++;
            end
            else begin
                $display("FAIL");
                $display("Branch: Expected=%h Actual=%h",
                         expected_branch, branch_target);
                $display("JAL:    Expected=%h Actual=%h",
                         expected_jal, jal_target);
                $display("JALR:   Expected=%h Actual=%h",
                         expected_jalr, jalr_target);
                fail_count++;
            end
        end
    endtask

    initial begin

        $dumpfile("pc_target_generator.vcd");
        $dumpvars(0, tb_pc_target_generator);

        $display("Starting PC Target Generator Testbench");

        // Test 1: Positive immediate
        pc       = 32'h00001000;
        rs1_data = 32'h00002003;
        imm      = 32'h00000010;

        check_output(
            32'h00001010,
            32'h00001010,
            32'h00002012
        );

        // Test 2: Negative immediate
        pc       = 32'h00001000;
        rs1_data = 32'h00002020;
        imm      = -32'sd16;

        check_output(
            32'h00000FF0,
            32'h00000FF0,
            32'h00002010
        );

        // Test 3: JALR result has bit 0 cleared
        pc       = 32'h00000100;
        rs1_data = 32'h00000201;
        imm      = 32'h00000004;

        check_output(
            32'h00000104,
            32'h00000104,
            32'h00000204
        );

        // Test 4: Zero immediate
        pc       = 32'h00001000;
        rs1_data = 32'h00002000;
        imm      = 32'h00000000;

        check_output(
            32'h00001000,
            32'h00001000,
            32'h00002000
        );

        // Test 5: Address wraparound
        pc       = 32'hFFFFFFFC;
        rs1_data = 32'hFFFFFFF0;
        imm      = 32'h00000008;

        check_output(
            32'h00000004,
            32'h00000004,
            32'hFFFFFFF8
        );

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
