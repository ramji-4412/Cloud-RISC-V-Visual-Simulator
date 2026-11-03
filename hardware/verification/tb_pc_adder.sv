module tb_pc_adder;

    logic [31:0] pc_current;
    logic [31:0] pc_plus4;

    integer pass_count = 0;
    integer fail_count = 0;

    pc_adder dut (.*);

    task automatic check_output(
        input logic [31:0] expected,
        input string test_name
    );
    begin
        #1;

        if (pc_plus4 === expected) begin
            $display("PASS: %s", test_name);
            pass_count++;
        end
        else begin
            $display("FAIL: %s | Expected=%h Actual=%h",
                     test_name, expected, pc_plus4);
            fail_count++;
        end
    end
    endtask

    initial begin

        $dumpfile("pc_adder.vcd");
        $dumpvars(0, tb_pc_adder);

        pc_current = 32'h00000000;
        check_output(32'h00000004, "PC = 0");

        pc_current = 32'h00000004;
        check_output(32'h00000008, "PC = 4");

        pc_current = 32'h00000100;
        check_output(32'h00000104, "PC = 0x100");

        pc_current = 32'h00001000;
        check_output(32'h00001004, "PC = 0x1000");

        pc_current = 32'hFFFFFFFC;
        check_output(32'h00000000, "32-bit overflow");

        pc_current = 32'h12345678;
        check_output(32'h1234567C, "Arbitrary PC address");

        $display("\n-------------------------------");
        $display("PC ADDER TEST SUMMARY");
        $display("-------------------------------");
        $display("Passed: %0d", pass_count);
        $display("Failed: %0d", fail_count);
        $display("-------------------------------");

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");
        else
            $display("SOME TESTS FAILED!");

        $finish;
    end

endmodule
