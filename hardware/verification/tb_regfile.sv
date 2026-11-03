
module tb_regfile;

    logic clk;
    logic we;

    logic [4:0] rd;
    logic [4:0] rs1;
    logic [4:0] rs2;

    logic [31:0] write_data;
    logic [31:0] read_data1;
    logic [31:0] read_data2;

    int pass_count = 0;
    int fail_count = 0;

    regfile dut (.*);

    // Clock generation
    initial clk = 0;
    always #5 clk = ~clk;

    task automatic check_output(
        input logic [31:0] expected1,
        input logic [31:0] expected2,
        input string test_name
    );
        begin
            #1;

            if ((read_data1 === expected1) &&
                (read_data2 === expected2)) begin

                pass_count++;
                $display("PASS: %s", test_name);

            end
            else begin

                fail_count++;
                $display("FAIL: %s", test_name);

                $display("Expected: %h %h",
                         expected1, expected2);

                $display("Actual:   %h %h",
                         read_data1, read_data2);
            end
        end
    endtask

    task automatic write_register(
        input logic [4:0] address,
        input logic [31:0] data
    );
        begin
            @(negedge clk);

            we = 1;
            rd = address;
            write_data = data;

            @(posedge clk);
            #1;

            we = 0;
        end
    endtask

    initial begin

        $dumpfile("regfile.vcd");
        $dumpvars(0, tb_regfile);

        we = 0;
        rd = 0;
        rs1 = 0;
        rs2 = 0;
        write_data = 0;

        // Test 1: Write x5
        write_register(5'd5, 32'd100);

        rs1 = 5'd5;
        rs2 = 5'd0;

        check_output(32'd100, 32'd0,
                     "Write and read x5");

        // Test 2: Write x10
        write_register(5'd10, 32'd200);

        rs1 = 5'd5;
        rs2 = 5'd10;

        check_output(32'd100, 32'd200,
                     "Simultaneous dual read");

        // Test 3: Attempt to write x0
        write_register(5'd0, 32'd999);

        rs1 = 5'd0;
        rs2 = 5'd5;

        check_output(32'd0, 32'd100,
                     "x0 write protection");

        // Test 4: Read x10 independently
        rs1 = 5'd10;
        rs2 = 5'd0;

        check_output(32'd200, 32'd0,
                     "Independent read");

        // Test 5: Overwrite x5
        write_register(5'd5, 32'd500);

        rs1 = 5'd5;
        rs2 = 5'd10;

        check_output(32'd500, 32'd200,
                     "Register overwrite");

        // Summary
        $display("--------------------------------");
        $display("REGISTER FILE TEST SUMMARY");
        $display("Passed: %0d", pass_count);
        $display("Failed: %0d", fail_count);
        $display("--------------------------------");

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");
        else
            $display("SOME TESTS FAILED!");

        $finish;

    end

endmodule
