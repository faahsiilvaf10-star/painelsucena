export interface Colaborador {
  id: number;
  nome: string;
  funcao: string;
  cpf: string;
  dataNascimento: string;
  admissao: string;
  matricula: string;
  contato: string;
  localidade: string;
}

export const colaboradoresAtivos: Colaborador[] = [
  { id: 1, nome: "ALEXSSANDRA SOUZA CHAVES", funcao: "TECNICO DE SEGURANÇA DO TRABALHO", cpf: "041.718.692-42", dataNascimento: "01/07/1999", admissao: "09/10/2025", matricula: "2133", contato: "(91) 99118-4515", localidade: "BARCARENA - PA" },
  { id: 2, nome: "ANDERSON DA CRUZ PINHEIRO", funcao: "MOTORISTA DE CAMINHÃO PIPA", cpf: "869.111.042-20", dataNascimento: "17/11/1985", admissao: "03/07/2025", matricula: "1901", contato: "(91) 99333-4008", localidade: "BARCARENA - PA" },
  { id: 3, nome: "ANDERSON DE ARAUJO BARARUA", funcao: "AJUDANTE", cpf: "028.884.982-51", dataNascimento: "29/08/1993", admissao: "03/03/2025", matricula: "1818", contato: "(91) 99144-7833", localidade: "BARCARENA - PA" },
  { id: 4, nome: "ANTONIO ERIC AMARAL GUERREIRO", funcao: "MECANICO", cpf: "072.111.652-35", dataNascimento: "15/07/2001", admissao: "14/04/2025", matricula: "1858", contato: "(91) 98600-5290", localidade: "BARCARENA - PA" },
  { id: 5, nome: "CARLOS ANDRE MOURÃO DOS REIS", funcao: "MOTORISTA DE CAMINHÃO MUNCK", cpf: "841.631.003-34", dataNascimento: "01/10/1980", admissao: "17/04/2025", matricula: "1860", contato: "(99) 99171-9415", localidade: "BARCARENA - PA" },
  { id: 6, nome: "COSME SILVA PONTES", funcao: "ENGENHEIRO DE SEGURANÇA DO TRABALHO", cpf: "986.794.143-87", dataNascimento: "18/09/1984", admissao: "15/08/2025", matricula: "2044", contato: "(94) 992723620", localidade: "BARCARENA - PA" },
  { id: 7, nome: "CRERIANE ALCANTARA NAVEGANTES", funcao: "APONTADOR", cpf: "015.695.022-77", dataNascimento: "10/12/1992", admissao: "02/12/2024", matricula: "1679", contato: "(91) 99201-1844", localidade: "BARCARENA - PA" },
  { id: 8, nome: "DANIELI FERREIRA COSTA FARIAS", funcao: "PLANEJADOR", cpf: "002.330.592-45", dataNascimento: "28/09/1989", admissao: "12/08/2024", matricula: "1376", contato: "(91) 99185-7924", localidade: "BARCARENA - PA" },
  { id: 9, nome: "DOMINGUES FABRICIO DA SILVA SOUSA", funcao: "ENCARREGADO GERAL", cpf: "070.273.393-82", dataNascimento: "22/06/1995", admissao: "30/10/2024", matricula: "1635", contato: "(91) 99392-2781", localidade: "BARCARENA - PA" },
  { id: 10, nome: "EDIELSON MARINHO MENDES", funcao: "MOTORISTA DE CAMINHÃO PIPA", cpf: "008.759.232-08", dataNascimento: "02/08/1990", admissao: "04/08/2025", matricula: "2020", contato: "(91) 98889-9209", localidade: "BARCARENA - PA" },
  { id: 11, nome: "EDSON DARLEY MOURA DA SILVA", funcao: "JARDINEIRO", cpf: "030.138.182-80", dataNascimento: "20/12/1995", admissao: "28/10/2024", matricula: "1624", contato: "(91) 98762-4256", localidade: "BARCARENA - PA" },
  { id: 12, nome: "EZEDEQUIAS FERREIRA DA SILVA", funcao: "AJUDANTE", cpf: "101.045.742-08", dataNascimento: "23/04/2004", admissao: "25/07/2025", matricula: "1985", contato: "(91) 98535-0940", localidade: "BARCARENA - PA" },
  { id: 13, nome: "FABIO GENILSON FERNANDES DOS REMEDIOS", funcao: "MOTORISTA DE CAMINHÃO PIPA", cpf: "771.529.302-44", dataNascimento: "17/11/1980", admissao: "24/10/2024", matricula: "1626", contato: "(91) 98429-6263", localidade: "BARCARENA - PA" },
  { id: 14, nome: "FELIPE DOS SANTOS PEREIRA", funcao: "AJUDANTE", cpf: "072.733.312-79", dataNascimento: "12/04/2006", admissao: "09/07/2025", matricula: "1907", contato: "(91) 993762176", localidade: "BARCARENA - PA" },
  { id: 15, nome: "FLAVIO HENRIQUE BARARUA CARDOSO", funcao: "AJUDANTE", cpf: "702.155.062-60", dataNascimento: "11/02/1998", admissao: "04/02/2025", matricula: "1777", contato: "(91) 99197-0979", localidade: "BARCARENA - PA" },
  { id: 16, nome: "ITAMAR DE SOUZA PEREIRA JUNIOR", funcao: "TECNICO DE SEGURANÇA DO TRABALHO", cpf: "081.118.102-29", dataNascimento: "10/10/2001", admissao: "17/12/2024", matricula: "1693", contato: "(91) 991918217", localidade: "BARCARENA - PA" },
  { id: 17, nome: "JAILSON CARDOSO DE MELO", funcao: "OFICIAL POLIVALENTE", cpf: "701.025.222-00", dataNascimento: "11/01/1996", admissao: "03/03/2025", matricula: "1821", contato: "(91) 98402-7493", localidade: "BARCARENA - PA" },
  { id: 18, nome: "JEFERSON SEIXAS RIBEIRO", funcao: "AJUDANTE", cpf: "041.103.412-05", dataNascimento: "11/10/1996", admissao: "16/07/2025", matricula: "1944", contato: "(91) 98263-9020", localidade: "BARCARENA - PA" },
  { id: 19, nome: "JEOVA MARCELINO RODRIGUES", funcao: "MOTORISTA DE CAMINHÃO MUNCK", cpf: "968.834.802-34", dataNascimento: "30/01/1983", admissao: "25/07/2025", matricula: "1990", contato: "(91) 99103-3555", localidade: "BARCARENA - PA" },
  { id: 20, nome: "JHEFFESON SILVA DE SOUSA", funcao: "JARDINEIRO", cpf: "063.758.922-01", dataNascimento: "06/09/1999", admissao: "17/02/2025", matricula: "1802", contato: "(91) 99180-9885", localidade: "BARCARENA - PA" },
  { id: 21, nome: "JOSE MARIA CORREA CORREA", funcao: "ENCARREGADO DE FRENTE DE SERVIÇO", cpf: "300.870.822-68", dataNascimento: "12/03/1969", admissao: "24/10/2024", matricula: "1625", contato: "(91) 99366-4244", localidade: "BARCARENA - PA" },
  { id: 22, nome: "JOSE ROBERTO RODRIGUES DE SOUZA", funcao: "OFICIAL POLIVALENTE", cpf: "002.368.922-66", dataNascimento: "13/07/1978", admissao: "02/04/2025", matricula: "1845", contato: "(91) 99392-3181", localidade: "BARCARENA - PA" },
  { id: 23, nome: "JOSIEL SOUZA SOARES", funcao: "AJUDANTE", cpf: "074.779.832-07", dataNascimento: "17/08/2001", admissao: "11/07/2025", matricula: "1916", contato: "(91) 99178-5535", localidade: "BARCARENA - PA" },
  { id: 24, nome: "LUIS CARLOS PASSOS ARAUJO", funcao: "ENGENHEIRO FLORESTAL", cpf: "904.884.152-68", dataNascimento: "19/03/1987", admissao: "03/10/2024", matricula: "1551", contato: "(93) 99210-4896", localidade: "BARCARENA - PA" },
  { id: 25, nome: "MATEUS COSTA SANTOS", funcao: "ELETRICISTA", cpf: "051.676.753-40", dataNascimento: "10/02/1994", admissao: "06/01/2023", matricula: "699", contato: "(91) 99156-6864", localidade: "BARCARENA - PA" },
  { id: 26, nome: "MARCELO PINHEIRO CARDOSO", funcao: "AJUDANTE DE ELETRICISTA", cpf: "919.978.012-72", dataNascimento: "16/04/1986", admissao: "24/10/2024", matricula: "1618", contato: "(91) 99346-8982", localidade: "BARCARENA - PA" },
  { id: 27, nome: "PAULO FELIX CARDOSO", funcao: "MOTORISTA DE CAMINHÃO PIPA", cpf: "189.584.782-68", dataNascimento: "15/06/1964", admissao: "06/10/2025", matricula: "2131", contato: "", localidade: "BARCARENA - PA" },
  { id: 28, nome: "RAIMUNDO PEREIRA DOS SANTOS", funcao: "MEIO OFICIAL", cpf: "358.663.732-20", dataNascimento: "29/11/1963", admissao: "14/05/2025", matricula: "1867", contato: "(96) 99115-3410", localidade: "BARCARENA - PA" },
  { id: 29, nome: "REGINALDO DOS SANTOS CARNEIRO", funcao: "OFICIAL POLIVALENTE", cpf: "732.526.382-15", dataNascimento: "01/04/1970", admissao: "03/03/2025", matricula: "1822", contato: "(91) 99353-9147", localidade: "BARCARENA - PA" },
  { id: 30, nome: "ROBSON LEANDRO SOUSA FUJISHIMA", funcao: "MOTORISTA DE CAMINHÃO PIPA", cpf: "471.568.642-20", dataNascimento: "31/07/1975", admissao: "18/11/2024", matricula: "1666", contato: "(91) 98574-9923", localidade: "BARCARENA - PA" },
  { id: 31, nome: "ROBERT WILIAN RODRIGUES PEREIRA", funcao: "AJUDANTE", cpf: "046.478.992-33", dataNascimento: "24/01/1998", admissao: "18/08/2025", matricula: "2045", contato: "(91) 99305-5217", localidade: "BARCARENA - PA" },
  { id: 32, nome: "RONALDINHO DOS SANTOS BARBOSA", funcao: "JARDINEIRO", cpf: "023.868.182-33", dataNascimento: "17/01/1996", admissao: "13/02/2025", matricula: "1796", contato: "(91) 99195-4913", localidade: "BARCARENA - PA" },
  { id: 33, nome: "RUDNEY SILVA BATISTA", funcao: "ENCARREGADO DE FRENTE DE SERVIÇO", cpf: "895.136.302-34", dataNascimento: "24/11/1986", admissao: "04/11/2024", matricula: "1656", contato: "(93) 99229-5994", localidade: "BARCARENA - PA" },
  { id: 34, nome: "THAYLON SILVA DA CONCEIÇÃO", funcao: "SINALEIRO RIGGER", cpf: "066.407.642-45", dataNascimento: "04/02/2003", admissao: "07/05/2025", matricula: "1865", contato: "(91) 98626-1282", localidade: "BARCARENA - PA" },
  { id: 35, nome: "TIAGO AUGUSTO ROSA MACHADO", funcao: "TECNICO DE MEIO AMBIENTE", cpf: "022.496.702-93", dataNascimento: "24/09/1993", admissao: "12/08/2025", matricula: "2037", contato: "(91) 98034-9149", localidade: "BARCARENA - PA" },
  { id: 36, nome: "VINICIUS MALCHER DE JESUS JUNIOR", funcao: "AJUDANTE", cpf: "082.923.572-89", dataNascimento: "12/09/2005", admissao: "14/04/2025", matricula: "1859", contato: "(91) 99136-2371", localidade: "BARCARENA - PA" },
  { id: 37, nome: "ZEDIANE DO CARMO MONTEIRO DA SILVA", funcao: "AUXILIAR DE ALMOXARIFE", cpf: "818.379.252-91", dataNascimento: "01/12/1980", admissao: "15/05/2025", matricula: "1868", contato: "(91) 99364-5741", localidade: "BARCARENA - PA" },
  { id: 38, nome: "WELBER SANTOS MENDES", funcao: "AJUDANTE", cpf: "053.159.272-37", dataNascimento: "13/02/2002", admissao: "14/08/2025", matricula: "2040", contato: "(91) 98193-8152", localidade: "BARCARENA - PA" },
  { id: 39, nome: "WELLINGTON MARCIO ALBUQUERQUE BARBOSA", funcao: "MOTORISTA DE CAMINHÃO PIPA", cpf: "032.969.812-50", dataNascimento: "08/08/1994", admissao: "03/11/2025", matricula: "2153", contato: "(91) 99268-8053", localidade: "BARCARENA - PA" },
];

// Get unique functions for filtering
export const funcoes = [...new Set(colaboradoresAtivos.map(c => c.funcao))].sort();
