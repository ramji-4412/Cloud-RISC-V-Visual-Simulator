module pc_adder (
    input  logic [31:0] pc_current,
    output logic [31:0] pc_plus4
);

    always_comb begin
        pc_plus4 = pc_current + 32'd4;
    end

endmodule
