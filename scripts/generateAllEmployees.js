import fs from 'fs';

// All pages from 1 to 93 (Col 1-3: EmpNo, Name, Dept) and 94 to 186 (Col 4-6: Date, Position, Done)
// We define each page pair.

const pagesData = [
  // Page 1 & 94
  {
    left: `P00005	Punzalan, Ma. Lourdes, Montemayor	Administration Department
P00007	Medalla, Mylene, Guiruela	Administration Department
P00010	Aleta, Irene, Garcia	Administration Department
P00012	Acebedo, Arriane	Administration Department
P00014	Nalus, Emeriza, Carmelo	Administration Department
P00015	Dumantay, Maylyn Ken, Vinluan	Administration Department
P00016	Antonio, Judy Ann, Lequina	Administration Department
P00017	Tria, Rochelle, Montecastro	Administration Department
P00018	Salenga, Geralyn, Dela Cruz	Administration Department
P00019	Daguinod, Victorio Jr, Coloso	Administration Department
P00020	Tolentino, Ronalyn, Licos	Administration Department
P00021	Demaña, Camille, Lacambra	Administration Department
P00023	Dimas, Marian Lee, Bedania	Administration Department
P00024	Casil, Dianne, Rempillo	Administration Department
PN0161	Reyes, Mariel, Dela Rosa	Administration Department
PN0505	Mendoza, Kay Anne, Alvez	Administration Department
PN0904	Francisco, Nichole, Herrera	Administration Department
PN0923	Reboya, Yhoraydyll, Selerio	Administration Department
PN1341	Matampac, Xialeen	Administration Department
P0003	Liu, Fujun	Administration(Expat-CN)
P0004	Gu, Zhiqiang	Administration(Expat-CN)
P0006	Jian, Jiqing	Administration(Expat-CN)
P0008	Liu, Yunjiang	Administration(Expat-CN)
P0009	Wang, Haiyan	Administration(Expat-CN)
P0011	Zhao, Yuliang	Administration(Expat-CN)
P0013	Yang, Li	Administration(Expat-CN)
P0022	Ge, Zhenbiao	Administration(Expat-CN)
PN0010	Zhao, Yange	Administration(Expat-CN)
PN0015	Liu, Yingjie	Administration(Expat-CN)
PN0023	Li, Hongtao	Administration(Expat-CN)
PN0031	Yang, Honghong	Administration(Expat-CN)
PN0056	Chen, Jun	Administration(Expat-CN)
PN0057	Zhang, Hui	Administration(Expat-CN)
PN0115	Shu, Sizhong	Administration(Expat-CN)
PN0160	Xu, Xiaoping	Administration(Expat-CN)
PN0271	Zhang, Zimei	Administration(Expat-CN)
PN0277	Zhan, Ziji	Administration(Expat-CN)
PN0312	Zou, Gaohua	Administration(Expat-CN)
PN0467	Xu, Jingxuan	Administration(Expat-CN)
PN0493	Gong, Dehong	Administration(Expat-CN)
PN0528	Zhou,Wensheng	Administration(Expat-CN)
PN0588	Jin, Xiaopeng	Administration(Expat-CN)
PN0695	Long, Zongyan	Administration(Expat-CN)
PN0919	Liu, Shuangqin	Administration(Expat-CN)
PN0943	Zhao, Juan	Administration(Expat-CN)
PN0944	Bai, Xiaofen	Administration(Expat-CN)
PN1266	Chen, Chunhong	Administration(Expat-CN)`,
    right: `2022-04-27	Nurse Leader	done
2018-04-11	ER Leader
2022-11-17	Nurse
2022-03-20	Admin staff	done
2024-04-15	Nursing Aid
2021-01-29	Nursing Aid
2019-01-15	Admin staff
2022-03-16	Compliance Auditor	done
2022-04-01	Admin staff
2023-08-09	Pollution Control Officer	done
2022-04-01	Phone Operator/Receptionist
2022-04-01	Admin staff	done
2024-08-27	Pollution Control Officer
2024-08-22	Compliance Auditor	done
2025-02-03	Admin staff	done
2025-05-19	Compliance Auditor	done
2025-02-12	Nurse
2025-03-21	Admin staff	done
2025-04-29	Nurse
2016-10-01	Team Leader
2016-09-15	Department Supervisor
2022-01-01	Team Leader
2017-02-20	Team Leader
2017-02-20	Department Supervisor
2016-10-01	Team Leader
2016-10-01	Team Leader
2017-04-27	Department Supervisor
2022-06-01	Team Leader
2022-06-01	Team Leader
2022-06-01	Team Leader
2022-06-01	Team Leader
2023-06-16	Team Leader
2023-06-16	Team Leader
2024-12-13	Department manager
2022-05-02	Team Leader
2022-05-02	Team Leader
2022-05-02	Team Leader
2023-07-17	Team Leader
2019-05-08	Team Leader
2025-05-17	Department Supervisor
2018-10-01	Team Leader
2019-09-02	Team Leader
2022-08-01	Team Leader
2022-07-16	Department Supervisor
2019-09-16	Team Leader
2025-01-14	Team Leader
2025-01-17	Team Leader`
  }
];

console.log("PagesData initialized");
