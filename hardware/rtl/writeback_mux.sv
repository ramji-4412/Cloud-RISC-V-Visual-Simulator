
module writeback_mux (
    input  logic [31:0] alu_result,
    input  logic [31:0] mem_read_data,
    input  logic [31:0] pc_plus4,
    input  logic [1:0]  result_src,
    output logic [31:0] writeback_data
);

    always_comb begin
        case (result_src)
            2'b00: writeback_data = alu_result;
            2'b01: writeback_data = mem_read_data;
            2'b10: writeback_data = pc_plus4;
            default: writeback_data = 32'b0;
        endcase
    end

endmodule
