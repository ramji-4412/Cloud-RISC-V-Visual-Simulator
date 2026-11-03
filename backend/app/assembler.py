import re
from typing import List, Dict, Optional, Tuple, Any

REGISTER_MAP = {}
for i in range(32):
    REGISTER_MAP[f'x{i}'] = i

ABI_NAMES = {
    'zero': 0, 'ra': 1, 'sp': 2, 'gp': 3, 'tp': 4,
    't0': 5, 't1': 6, 't2': 7, 's0': 8, 'fp': 8, 's1': 9,
    'a0': 10, 'a1': 11, 'a2': 12, 'a3': 13, 'a4': 14, 'a5': 15,
    'a6': 16, 'a7': 17, 's2': 18, 's3': 19, 's4': 20, 's5': 21,
    's6': 22, 's7': 23, 's8': 24, 's9': 25, 's10': 26, 's11': 27,
    't3': 28, 't4': 29, 't5': 30, 't6': 31,
}
REGISTER_MAP.update(ABI_NAMES)

R_TYPE_INSTRUCTIONS = {
    'add': (0b0000000, 0b000, 0b0110011), 'sub': (0b0100000, 0b000, 0b0110011),
    'sll': (0b0000000, 0b001, 0b0110011), 'slt': (0b0000000, 0b010, 0b0110011),
    'sltu': (0b0000000, 0b011, 0b0110011), 'xor': (0b0000000, 0b100, 0b0110011),
    'srl': (0b0000000, 0b101, 0b0110011), 'sra': (0b0100000, 0b101, 0b0110011),
    'or': (0b0000000, 0b110, 0b0110011), 'and': (0b0000000, 0b111, 0b0110011),
}

I_TYPE_ALU = {
    'addi': (0b000, 0, 0b0010011), 'slti': (0b010, 0, 0b0010011),
    'sltiu': (0b011, 0, 0b0010011), 'xori': (0b100, 0, 0b0010011),
    'ori': (0b110, 0, 0b0010011), 'andi': (0b111, 0, 0b0010011),
    'slli': (0b001, 0, 0b0010011), 'srli': (0b101, 0, 0b0010011),
    'srai': (0b101, 0, 0b0010011),
}

LOAD_INSTRUCTIONS = {'lw': (0b010, 0b0000011)}
STORE_INSTRUCTIONS = {'sw': (0b010, 0b0100011)}
BRANCH_INSTRUCTIONS = {'beq': 0b000, 'bne': 0b001, 'blt': 0b100, 'bge': 0b101, 'bltu': 0b110, 'bgeu': 0b111}
JAL_OPCODE = 0b1101111
JALR_OPCODE = 0b1100111
JALR_FUNCT3 = 0b000
LUI_OPCODE = 0b0110111
AUIPC_OPCODE = 0b0010111


def parse_register(token):
    token = token.strip().lower()
    if token not in REGISTER_MAP:
        raise ValueError(f'Invalid register: {token}')
    return REGISTER_MAP[token]


def parse_immediate(token):
    token = token.strip()
    try:
        if token.startswith('0x') or token.startswith('0X'):
            return int(token, 16)
        elif token.startswith('0b') or token.startswith('0B'):
            return int(token, 2)
        else:
            return int(token, 10)
    except ValueError:
        raise ValueError(f'Invalid immediate: {token}')


def check_range(value, min_val, max_val, name):
    if value < min_val or value > max_val:
        raise ValueError(f'{name} out of range: {value} (must be {min_val} to {max_val})')


def encode_r_type(funct7, rs2, rs1, funct3, rd, opcode):
    return ((funct7 & 0x7F) << 25 | (rs2 & 0x1F) << 20 | (rs1 & 0x1F) << 15 |
            (funct3 & 0x7) << 12 | (rd & 0x1F) << 7 | (opcode & 0x7F))


def encode_i_type(imm, rs1, funct3, rd, opcode):
    imm = imm & 0xFFF
    return ((imm & 0xFFF) << 20 | (rs1 & 0x1F) << 15 | (funct3 & 0x7) << 12 |
            (rd & 0x1F) << 7 | (opcode & 0x7F))


def encode_s_type(imm, rs2, rs1, funct3, opcode):
    imm = imm & 0xFFF
    return (((imm >> 5) & 0x7F) << 25 | (rs2 & 0x1F) << 20 | (rs1 & 0x1F) << 15 |
            (funct3 & 0x7) << 12 | (imm & 0x1F) << 7 | (opcode & 0x7F))


def encode_b_type(imm, rs2, rs1, funct3, opcode):
    if imm % 2 != 0:
        raise ValueError(f'Branch offset must be even: {imm}')
    imm = imm & 0x1FFF
    bit12 = (imm >> 12) & 0x1
    bit11 = (imm >> 11) & 0x1
    bits10_5 = (imm >> 5) & 0x3F
    bits4_1 = (imm >> 1) & 0xF
    return ((bit12 & 0x1) << 31 | (bits10_5 & 0x3F) << 25 | (rs2 & 0x1F) << 20 |
            (rs1 & 0x1F) << 15 | (funct3 & 0x7) << 12 | (bits4_1 & 0xF) << 8 |
            (bit11 & 0x1) << 7 | (opcode & 0x7F))


def encode_u_type(imm, rd, opcode):
    imm = imm & 0xFFFFF000
    return ((imm & 0xFFFFF000) | (rd & 0x1F) << 7 | (opcode & 0x7F))


def encode_j_type(imm, rd, opcode):
    if imm % 2 != 0:
        raise ValueError(f'Jump offset must be even: {imm}')
    imm = imm & 0x1FFFFF
    bit20 = (imm >> 20) & 0x1
    bits19_12 = (imm >> 12) & 0xFF
    bit11 = (imm >> 11) & 0x1
    bits10_1 = (imm >> 1) & 0x3FF
    return ((bit20 & 0x1) << 31 | (bits10_1 & 0x3FF) << 21 | (bit11 & 0x1) << 20 |
            (bits19_12 & 0xFF) << 12 | (rd & 0x1F) << 7 | (opcode & 0x7F))


class AssemblerError(Exception):
    def __init__(self, line, message, source=''):
        self.line = line
        self.message = message
        self.source = source
        super().__init__(f'Line {line}: {message}')

    def to_dict(self):
        return {'line': self.line, 'category': 'ASSEMBLY_ERROR',
                'message': self.message, 'source': self.source}


class Assembler:
    def __init__(self):
        self.labels = {}
        self.instructions = []
        self.errors = []
        self.source_lines = []

    def assemble(self, source):
        self.labels = {}
        self.instructions = []
        self.errors = []
        self.source_lines = source.split('\n')
        self._pass1()
        self._pass2()
        if self.errors:
            return {'success': False, 'instruction_count': 0, 'instructions': [],
                    'machine_code': [], 'errors': [e.to_dict() for e in self.errors]}
        instr_list = []
        machine_code = []
        for idx, instr in enumerate(self.instructions):
            addr = idx * 4
            mc = instr['machine_code']
            machine_code.append(f'{mc:08X}')
            instr_list.append({
                'address': f'0x{addr:08X}',
                'source_line': instr['source_line'],
                'assembly': instr['assembly'],
                'machine_code': f'0x{mc:08X}',
                'hex': f'{mc:08X}',
            })
        return {'success': True, 'instruction_count': len(self.instructions),
                'instructions': instr_list, 'machine_code': machine_code, 'errors': []}

    def _strip_comments(self, line):
        if '//' in line:
            line = line.split('//', 1)[0]
        if '#' in line:
            line = line.split('#', 1)[0]
        return line

    def _pass1(self):
        address = 0
        for line_num, line in enumerate(self.source_lines, 1):
            line = self._strip_comments(line).strip()
            if not line:
                continue
            if ':' in line:
                parts = line.split(':', 1)
                label = parts[0].strip()
                rest = parts[1].strip() if len(parts) > 1 else ''
                if not label:
                    self.errors.append(AssemblerError(line_num, 'Empty label name', line))
                    continue
                if label in self.labels:
                    self.errors.append(AssemblerError(line_num, f'Duplicate label: {label}', line))
                    continue
                if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', label):
                    self.errors.append(AssemblerError(line_num, f'Invalid label name: {label}', line))
                    continue
                self.labels[label] = address
                if rest:
                    address += 4
                continue
            address += 4

    def _pass2(self):
        for line_num, line in enumerate(self.source_lines, 1):
            original_line = line
            line = self._strip_comments(line).strip()
            if not line:
                continue
            if ':' in line:
                parts = line.split(':', 1)
                line = parts[1].strip()
                if not line:
                    continue
            try:
                instr = self._encode_instruction(line, line_num, original_line)
                if instr is not None:
                    self.instructions.append(instr)
            except AssemblerError as e:
                self.errors.append(e)
            except Exception as e:
                self.errors.append(AssemblerError(line_num, str(e), original_line))

    def _encode_instruction(self, line, line_num, original_line):
        tokens = re.split(r'[,\s]+', line.strip())
        tokens = [t for t in tokens if t]
        if not tokens:
            return None
        mnemonic = tokens[0].lower()
        operands = tokens[1:]
        if mnemonic in R_TYPE_INSTRUCTIONS:
            return self._encode_r_type(mnemonic, operands, line_num, original_line)
        elif mnemonic in I_TYPE_ALU:
            return self._encode_i_type_alu(mnemonic, operands, line_num, original_line)
        elif mnemonic in LOAD_INSTRUCTIONS:
            return self._encode_load(mnemonic, operands, line_num, original_line)
        elif mnemonic in STORE_INSTRUCTIONS:
            return self._encode_store(mnemonic, operands, line_num, original_line)
        elif mnemonic in BRANCH_INSTRUCTIONS:
            return self._encode_branch(mnemonic, operands, line_num, original_line)
        elif mnemonic == 'jal':
            return self._encode_jal(operands, line_num, original_line)
        elif mnemonic == 'jalr':
            return self._encode_jalr(operands, line_num, original_line)
        elif mnemonic == 'lui':
            return self._encode_lui(operands, line_num, original_line)
        elif mnemonic == 'auipc':
            return self._encode_auipc(operands, line_num, original_line)
        else:
            raise AssemblerError(line_num, f'Unknown instruction: {mnemonic}', original_line)

    def _encode_r_type(self, mnemonic, operands, line_num, original_line):
        if len(operands) != 3:
            raise AssemblerError(line_num, f'{mnemonic} requires 3 operands (rd, rs1, rs2), got {len(operands)}', original_line)
        try:
            rd = parse_register(operands[0])
            rs1 = parse_register(operands[1])
            rs2 = parse_register(operands[2])
        except ValueError as e:
            raise AssemblerError(line_num, str(e), original_line)
        funct7, funct3, opcode = R_TYPE_INSTRUCTIONS[mnemonic]
        mc = encode_r_type(funct7, rs2, rs1, funct3, rd, opcode)
        return {'assembly': original_line.strip(), 'source_line': line_num, 'machine_code': mc}

    def _encode_i_type_alu(self, mnemonic, operands, line_num, original_line):
        if len(operands) != 3:
            raise AssemblerError(line_num, f'{mnemonic} requires 3 operands (rd, rs1, imm), got {len(operands)}', original_line)
        try:
            rd = parse_register(operands[0])
            rs1 = parse_register(operands[1])
            imm = parse_immediate(operands[2])
        except ValueError as e:
            raise AssemblerError(line_num, str(e), original_line)
        check_range(imm, -2048, 2047, 'immediate')
        funct3, _, opcode = I_TYPE_ALU[mnemonic]
        if mnemonic in ('slli', 'srli', 'srai'):
            shamt = imm & 0x1F
            if mnemonic == 'srai':
                funct7 = 0b0100000
            else:
                funct7 = 0b0000000
            imm_encoded = (funct7 << 5) | shamt
            mc = encode_i_type(imm_encoded, rs1, funct3, rd, opcode)
        else:
            mc = encode_i_type(imm, rs1, funct3, rd, opcode)
        return {'assembly': original_line.strip(), 'source_line': line_num, 'machine_code': mc}

    def _encode_load(self, mnemonic, operands, line_num, original_line):
        if len(operands) != 2:
            raise AssemblerError(line_num, f'{mnemonic} requires 2 operands (rd, imm(rs1)), got {len(operands)}', original_line)
        mem_match = re.match(r'^(.+)\((.+)\)$', operands[1].strip())
        if not mem_match:
            raise AssemblerError(line_num, f'Invalid memory operand: {operands[1]}', original_line)
        try:
            rd = parse_register(operands[0])
            rs1 = parse_register(mem_match.group(2).strip())
            imm = parse_immediate(mem_match.group(1).strip())
        except ValueError as e:
            raise AssemblerError(line_num, str(e), original_line)
        check_range(imm, -2048, 2047, 'immediate')
        funct3, opcode = LOAD_INSTRUCTIONS[mnemonic]
        mc = encode_i_type(imm, rs1, funct3, rd, opcode)
        return {'assembly': original_line.strip(), 'source_line': line_num, 'machine_code': mc}

    def _encode_store(self, mnemonic, operands, line_num, original_line):
        if len(operands) != 2:
            raise AssemblerError(line_num, f'{mnemonic} requires 2 operands (rs2, imm(rs1)), got {len(operands)}', original_line)
        mem_match = re.match(r'^(.+)\((.+)\)$', operands[1].strip())
        if not mem_match:
            raise AssemblerError(line_num, f'Invalid memory operand: {operands[1]}', original_line)
        try:
            rs2 = parse_register(operands[0])
            rs1 = parse_register(mem_match.group(2).strip())
            imm = parse_immediate(mem_match.group(1).strip())
        except ValueError as e:
            raise AssemblerError(line_num, str(e), original_line)
        check_range(imm, -2048, 2047, 'immediate')
        funct3, opcode = STORE_INSTRUCTIONS[mnemonic]
        mc = encode_s_type(imm, rs2, rs1, funct3, opcode)
        return {'assembly': original_line.strip(), 'source_line': line_num, 'machine_code': mc}

    def _encode_branch(self, mnemonic, operands, line_num, original_line):
        if len(operands) != 3:
            raise AssemblerError(line_num, f'{mnemonic} requires 3 operands (rs1, rs2, label), got {len(operands)}', original_line)
        try:
            rs1 = parse_register(operands[0])
            rs2 = parse_register(operands[1])
        except ValueError as e:
            raise AssemblerError(line_num, str(e), original_line)
        target = operands[2].strip()
        try:
            offset = parse_immediate(target)
        except ValueError:
            if target not in self.labels:
                raise AssemblerError(line_num, f'Undefined label: {target}', original_line)
            current_addr = len(self.instructions) * 4
            target_addr = self.labels[target]
            offset = target_addr - current_addr
        check_range(offset, -4096, 4094, 'branch offset')
        if offset % 2 != 0:
            raise AssemblerError(line_num, f'Branch offset must be even: {offset}', original_line)
        funct3 = BRANCH_INSTRUCTIONS[mnemonic]
        opcode = 0b1100011
        mc = encode_b_type(offset, rs2, rs1, funct3, opcode)
        return {'assembly': original_line.strip(), 'source_line': line_num, 'machine_code': mc}

    def _encode_jal(self, operands, line_num, original_line):
        if len(operands) != 2:
            raise AssemblerError(line_num, f'jal requires 2 operands (rd, label), got {len(operands)}', original_line)
        try:
            rd = parse_register(operands[0])
        except ValueError as e:
            raise AssemblerError(line_num, str(e), original_line)
        target = operands[1].strip()
        try:
            offset = parse_immediate(target)
        except ValueError:
            if target not in self.labels:
                raise AssemblerError(line_num, f'Undefined label: {target}', original_line)
            current_addr = len(self.instructions) * 4
            target_addr = self.labels[target]
            offset = target_addr - current_addr
        check_range(offset, -1048576, 1048574, 'jump offset')
        if offset % 2 != 0:
            raise AssemblerError(line_num, f'Jump offset must be even: {offset}', original_line)
        mc = encode_j_type(offset, rd, JAL_OPCODE)
        return {'assembly': original_line.strip(), 'source_line': line_num, 'machine_code': mc}

    def _encode_jalr(self, operands, line_num, original_line):
        if len(operands) not in (2, 3):
            raise AssemblerError(line_num, f'jalr requires 2 or 3 operands, got {len(operands)}', original_line)
        try:
            if len(operands) == 3:
                rd = parse_register(operands[0])
                rs1 = parse_register(operands[1])
                imm = parse_immediate(operands[2])
            else:
                mem_match = re.match(r'^(.+)\((.+)\)$', operands[1].strip())
                if not mem_match:
                    raise AssemblerError(line_num, f'Invalid JALR operand: {operands[1]}', original_line)
                rd = parse_register(operands[0])
                rs1 = parse_register(mem_match.group(2).strip())
                imm = parse_immediate(mem_match.group(1).strip())
        except ValueError as e:
            raise AssemblerError(line_num, str(e), original_line)
        check_range(imm, -2048, 2047, 'immediate')
        mc = encode_i_type(imm, rs1, JALR_FUNCT3, rd, JALR_OPCODE)
        return {'assembly': original_line.strip(), 'source_line': line_num, 'machine_code': mc}

    def _encode_lui(self, operands, line_num, original_line):
        if len(operands) != 2:
            raise AssemblerError(line_num, f'lui requires 2 operands (rd, imm), got {len(operands)}', original_line)
        try:
            rd = parse_register(operands[0])
            imm = parse_immediate(operands[1])
        except ValueError as e:
            raise AssemblerError(line_num, str(e), original_line)
        if imm > 0xFFFFF or imm < -0x80000:
            imm = (imm >> 12) & 0xFFFFF
        check_range(imm, 0, 0xFFFFF, 'LUI immediate')
        mc = encode_u_type(imm << 12, rd, LUI_OPCODE)
        return {'assembly': original_line.strip(), 'source_line': line_num, 'machine_code': mc}

    def _encode_auipc(self, operands, line_num, original_line):
        if len(operands) != 2:
            raise AssemblerError(line_num, f'auipc requires 2 operands (rd, imm), got {len(operands)}', original_line)
        try:
            rd = parse_register(operands[0])
            imm = parse_immediate(operands[1])
        except ValueError as e:
            raise AssemblerError(line_num, str(e), original_line)
        if imm > 0xFFFFF or imm < -0x80000:
            imm = (imm >> 12) & 0xFFFFF
        check_range(imm, 0, 0xFFFFF, 'AUIPC immediate')
        mc = encode_u_type(imm << 12, rd, AUIPC_OPCODE)
        return {'assembly': original_line.strip(), 'source_line': line_num, 'machine_code': mc}


def assemble(source):
    assembler = Assembler()
    return assembler.assemble(source)
