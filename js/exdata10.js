/* BreedingPro — Block 10 example data: records with their pedigree (sire and dam columns;
   parents without a row of their own are founders). Published textbook examples; the
   simulated ones are generated in block10.js with a fixed seed. */
window.EXDATA10 = {
  /* Mrode (2014), Example 3.1: pre-weaning gain (kg), sex fixed, σ²a = 20, σ²e = 40 */
  mrode31: `Calf,Sire,Dam,Sex,WWG
4,1,0,Male,4.5
5,3,2,Female,2.9
6,1,2,Female,3.9
7,4,5,Male,3.5
8,3,6,Male,5.0`,
  /* Schaeffer (2019), Table 3.1: years fixed, contemporary groups random; σ²a = 64, σ²CG = 36, σ²e = 144 */
  schaeffer31: `Animal,Sire,Dam,Herd,Year,CG,y
15,1,2,1,1,1,94
16,1,2,1,1,1,89
17,3,4,1,1,1,72
18,3,6,1,1,1,100
19,13,2,1,2,2,73
20,5,4,1,2,2,70
21,5,4,1,2,2,84
22,1,8,2,1,3,88
23,1,10,2,1,3,102
24,7,12,2,1,3,82
25,7,14,2,1,3,130
26,5,8,2,2,4,93
27,5,10,2,2,4,105
28,9,12,2,2,4,118
29,11,14,2,2,4,69`,
  /* Schaeffer (2019), Tables 6.1–6.2: repeated records, years fixed, herd-year groups and permanent
     environment random; σ²a = 36, σ²CG = 20, σ²PE = 16, σ²e = 100 */
  schaeffer61: `Herd,Animal,Sire,Dam,Year,CG,y
1,7,1,2,1,H1Y1,69
1,7,1,2,2,H1Y2,53
1,7,1,2,3,H1Y3,65
1,8,3,4,1,H1Y1,37
1,8,3,4,2,H1Y2,47
1,9,5,6,1,H1Y1,39
1,9,5,6,3,H1Y3,62
1,10,1,4,2,H1Y2,48
1,10,1,4,3,H1Y3,72
1,11,3,6,3,H1Y3,96
1,12,1,2,2,H1Y2,72
2,19,1,14,1,H2Y1,55
2,19,1,14,2,H2Y2,51
2,19,1,14,3,H2Y3,86
2,20,13,16,1,H2Y1,48
2,20,13,16,2,H2Y2,72
2,21,15,17,1,H2Y1,71
2,21,15,17,3,H2Y3,96
2,22,13,18,2,H2Y2,56
2,22,13,18,3,H2Y3,47
2,23,5,14,2,H2Y2,51
2,24,15,16,3,H2Y3,77`,
  /* Mrode (2014), Example 5.2: weaning weight of piglets, sex fixed, litter (common environment)
     random; σ²a = 20, σ²c = 15, σ²e = 65 */
  mrode52: `Piglet,Sire,Dam,Sex,Litter,WW
6,1,2,M,1,90
7,1,2,F,1,70
8,1,2,F,1,65
9,3,4,F,2,98
10,3,4,M,2,106
11,3,4,F,2,60
12,3,4,F,2,80
13,1,5,M,3,100
14,1,5,F,3,85
15,1,5,M,3,68`,
};
