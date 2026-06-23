import { useState, useMemo } from 'react';
import { saveOnboarding } from '../lib/supabase/progressSync';

// gen    = full genitive phrase   — "Som ${gen}"
// loc    = full locative phrase   — "Bývam ${loc}"
// adj_m  = masculine adjective    — "nemecký muž"
// adj_f  = feminine adjective     — "nemecká žena"
// adj_n  = neuter adjective       — "nemecké auto"
// adv    = adverb                 — "hovorím ${adv}"
interface Country {
  en: string; sk: string;
  gen: string; loc: string;
  adj_m: string; adj_f: string; adj_n: string; adv: string;
  disabled?: boolean;
}

const COUNTRIES: Country[] = [
  { en: 'Afghanistan',                    sk: 'Afganistan',                        gen: 'z Afganistanu',                          loc: 'v Afganistane',                          adj_m: 'afganský',                  adj_f: 'afganská',                  adj_n: 'afganské',                  adv: 'afgansky' },
  { en: 'Albania',                         sk: 'Albánsko',                          gen: 'z Albánska',                             loc: 'v Albánsku',                             adj_m: 'albánsky',                  adj_f: 'albánska',                  adj_n: 'albánske',                  adv: 'albánsky' },
  { en: 'Algeria',                          sk: 'Alžírsko',                          gen: 'z Alžírska',                             loc: 'v Alžírsku',                             adj_m: 'alžírsky',                  adj_f: 'alžírska',                  adj_n: 'alžírske',                  adv: 'alžírsky' },
  { en: 'Andorra',                          sk: 'Andorra',                           gen: 'z Andorry',                              loc: 'v Andorre',                              adj_m: 'andorrský',                 adj_f: 'andorrská',                 adj_n: 'andorrské',                 adv: 'andorrsky' },
  { en: 'Angola',                           sk: 'Angola',                            gen: 'z Angoly',                               loc: 'v Angole',                               adj_m: 'angolský',                  adj_f: 'angolská',                  adj_n: 'angolské',                  adv: 'angolsky' },
  { en: 'Antigua and Barbuda',              sk: 'Antigua a Barbuda',                 gen: 'z Antiguy a Barbudy',                    loc: 'na Antigue a Barbude',                   adj_m: 'antiguanský',               adj_f: 'antiguanská',               adj_n: 'antiguanské',               adv: 'antiguansky' },
  { en: 'Argentina',                        sk: 'Argentína',                         gen: 'z Argentíny',                            loc: 'v Argentíne',                            adj_m: 'argentínsky',               adj_f: 'argentínska',               adj_n: 'argentínske',               adv: 'argentínsky' },
  { en: 'Armenia',                          sk: 'Arménsko',                          gen: 'z Arménska',                             loc: 'v Arménsku',                             adj_m: 'arménsky',                  adj_f: 'arménska',                  adj_n: 'arménske',                  adv: 'arménsky' },
  { en: 'Australia',                        sk: 'Austrália',                         gen: 'z Austrálie',                            loc: 'v Austrálii',                            adj_m: 'austrálsky',                adj_f: 'austrálska',                adj_n: 'austrálske',                adv: 'austrálsky' },
  { en: 'Austria',                          sk: 'Rakúsko',                           gen: 'z Rakúska',                              loc: 'v Rakúsku',                              adj_m: 'rakúsky',                   adj_f: 'rakúska',                   adj_n: 'rakúske',                   adv: 'rakúsky' },
  { en: 'Azerbaijan',                       sk: 'Azerbajdžan',                       gen: 'z Azerbajdžanu',                         loc: 'v Azerbajdžane',                         adj_m: 'azerbajdžanský',            adj_f: 'azerbajdžanská',            adj_n: 'azerbajdžanské',            adv: 'azerbajdžansky' },
  { en: 'Bahamas',                          sk: 'Bahamy',                            gen: 'z Bahám',                                loc: 'na Bahamách',                            adj_m: 'bahamský',                  adj_f: 'bahamská',                  adj_n: 'bahamské',                  adv: 'bahamsky' },
  { en: 'Bahrain',                          sk: 'Bahrajn',                           gen: 'z Bahrajnu',                             loc: 'v Bahrajne',                             adj_m: 'bahrajnský',                adj_f: 'bahrajnská',                adj_n: 'bahrajnské',                adv: 'bahrajnsky' },
  { en: 'Bangladesh',                       sk: 'Bangladéš',                         gen: 'z Bangladéša',                           loc: 'v Bangladéši',                           adj_m: 'bangladéšsky',              adj_f: 'bangladéšska',              adj_n: 'bangladéšske',              adv: 'bangladéšsky' },
  { en: 'Barbados',                         sk: 'Barbados',                          gen: 'z Barbadosu',                            loc: 'na Barbadose',                           adj_m: 'barbadoský',                adj_f: 'barbadoská',                adj_n: 'barbadoské',                adv: 'barbadosky' },
  { en: 'Belarus',                          sk: 'Bielorusko',                        gen: 'z Bieloruska',                           loc: 'v Bielorusku',                           adj_m: 'bieloruský',                adj_f: 'bieloruská',                adj_n: 'bieloruské',                adv: 'bielorusky' },
  { en: 'Belgium',                          sk: 'Belgicko',                          gen: 'z Belgicka',                             loc: 'v Belgicku',                             adj_m: 'belgický',                  adj_f: 'belgická',                  adj_n: 'belgické',                  adv: 'belgicky' },
  { en: 'Belize',                           sk: 'Belize',                            gen: 'z Belize',                               loc: 'v Belize',                               adj_m: 'belizský',                  adj_f: 'belizská',                  adj_n: 'belizské',                  adv: 'belizsky' },
  { en: 'Benin',                            sk: 'Benin',                             gen: 'z Beninu',                               loc: 'v Benine',                               adj_m: 'beninský',                  adj_f: 'beninská',                  adj_n: 'beninské',                  adv: 'beninsky' },
  { en: 'Bhutan',                           sk: 'Bhután',                            gen: 'z Bhutánu',                              loc: 'v Bhutáne',                              adj_m: 'bhutánsky',                 adj_f: 'bhutánska',                 adj_n: 'bhutánske',                 adv: 'bhutánsky' },
  { en: 'Bolivia',                          sk: 'Bolívia',                           gen: 'z Bolívie',                              loc: 'v Bolívii',                              adj_m: 'bolívijský',                adj_f: 'bolívijská',                adj_n: 'bolívijské',                adv: 'bolívijsky' },
  { en: 'Bosnia and Herzegovina',           sk: 'Bosna a Hercegovina',               gen: 'z Bosny a Hercegoviny',                  loc: 'v Bosne a Hercegovine',                  adj_m: 'bosnianskohercegovský',     adj_f: 'bosnianskohercegovská',     adj_n: 'bosnianskohercegovské',     adv: 'bosnianskohercegovský' },
  { en: 'Botswana',                         sk: 'Botswana',                          gen: 'z Botswany',                             loc: 'v Botswane',                             adj_m: 'botswanský',                adj_f: 'botswanská',                adj_n: 'botswanské',                adv: 'botswansky' },
  { en: 'Brazil',                           sk: 'Brazília',                          gen: 'z Brazílie',                             loc: 'v Brazílii',                             adj_m: 'brazílsky',                 adj_f: 'brazílska',                 adj_n: 'brazílske',                 adv: 'brazílsky' },
  { en: 'Brunei',                           sk: 'Brunej',                            gen: 'z Bruneja',                              loc: 'v Bruneji',                              adj_m: 'brunejský',                 adj_f: 'brunejská',                 adj_n: 'brunejské',                 adv: 'brunejsky' },
  { en: 'Bulgaria',                         sk: 'Bulharsko',                         gen: 'z Bulharska',                            loc: 'v Bulharsku',                            adj_m: 'bulharský',                 adj_f: 'bulharská',                 adj_n: 'bulharské',                 adv: 'bulharsky' },
  { en: 'Burkina Faso',                     sk: 'Burkina Faso',                      gen: 'z Burkiny Faso',                         loc: 'v Burkine Faso',                         adj_m: 'burkinský',                 adj_f: 'burkinská',                 adj_n: 'burkinské',                 adv: 'burkinsky' },
  { en: 'Burundi',                          sk: 'Burundi',                           gen: 'z Burundi',                              loc: 'v Burundi',                              adj_m: 'burundský',                 adj_f: 'burundská',                 adj_n: 'burundské',                 adv: 'burundsky' },
  { en: 'Cabo Verde',                       sk: 'Kapverdy',                          gen: 'z Kapverd',                              loc: 'na Kapverdách',                          adj_m: 'kapverdský',                adj_f: 'kapverdská',                adj_n: 'kapverdské',                adv: 'kapverdsky' },
  { en: 'Cambodia',                         sk: 'Kambodža',                          gen: 'z Kambodže',                             loc: 'v Kambodži',                             adj_m: 'kambodžský',                adj_f: 'kambodžská',                adj_n: 'kambodžské',                adv: 'kambodžsky' },
  { en: 'Cameroon',                         sk: 'Kamerun',                           gen: 'z Kamerunu',                             loc: 'v Kamerune',                             adj_m: 'kamerunský',                adj_f: 'kamerunská',                adj_n: 'kamerunské',                adv: 'kamerunsky' },
  { en: 'Canada',                           sk: 'Kanada',                            gen: 'z Kanady',                               loc: 'v Kanade',                               adj_m: 'kanadský',                  adj_f: 'kanadská',                  adj_n: 'kanadské',                  adv: 'kanadsky' },
  { en: 'Central African Republic',         sk: 'Stredoafrická republika',           gen: 'zo Stredoafrickej republiky',            loc: 'v Stredoafrickej republike',             adj_m: 'stredoafrický',             adj_f: 'stredoafrická',             adj_n: 'stredoafrické',             adv: 'stredoafricky' },
  { en: 'Chad',                             sk: 'Čad',                               gen: 'z Čadu',                                 loc: 'v Čade',                                 adj_m: 'čadský',                    adj_f: 'čadská',                    adj_n: 'čadské',                    adv: 'čadsky' },
  { en: 'Chile',                            sk: 'Čile',                              gen: 'z Čile',                                 loc: 'v Čile',                                 adj_m: 'čilský',                    adj_f: 'čilská',                    adj_n: 'čilské',                    adv: 'čilsky' },
  { en: 'China',                            sk: 'Čína',                              gen: 'z Číny',                                 loc: 'v Číne',                                 adj_m: 'čínsky',                    adj_f: 'čínska',                    adj_n: 'čínske',                    adv: 'čínsky' },
  { en: 'Colombia',                         sk: 'Kolumbia',                          gen: 'z Kolumbie',                             loc: 'v Kolumbii',                             adj_m: 'kolumbijský',               adj_f: 'kolumbijská',               adj_n: 'kolumbijské',               adv: 'kolumbijsky' },
  { en: 'Comoros',                          sk: 'Komory',                            gen: 'z Komor',                                loc: 'na Komorách',                            adj_m: 'komorský',                  adj_f: 'komorská',                  adj_n: 'komorské',                  adv: 'komorsky' },
  { en: 'Congo (Brazzaville)',              sk: 'Kongo',                             gen: 'z Konga',                                loc: 'v Kongu',                                adj_m: 'konžský',                   adj_f: 'konžská',                   adj_n: 'konžské',                   adv: 'konžsky' },
  { en: 'Congo (DRC)',                      sk: 'Konžská demokratická republika',    gen: 'z Konžskej demokratickej republiky',     loc: 'v Konžskej demokratickej republike',     adj_m: 'konžský',                   adj_f: 'konžská',                   adj_n: 'konžské',                   adv: 'konžsky' },
  { en: 'Costa Rica',                       sk: 'Kostarika',                         gen: 'z Kostariky',                            loc: 'v Kostarike',                            adj_m: 'kostarický',                adj_f: 'kostarická',                adj_n: 'kostarické',                adv: 'kostaricky' },
  { en: "Côte d'Ivoire",                   sk: 'Pobrežie Slonoviny',               gen: 'z Pobrežia Slonoviny',                   loc: 'v Pobreží Slonoviny',                    adj_m: 'ivorský',                   adj_f: 'ivorská',                   adj_n: 'ivorské',                   adv: 'ivorsky' },
  { en: 'Croatia',                          sk: 'Chorvátsko',                        gen: 'z Chorvátska',                           loc: 'v Chorvátsku',                           adj_m: 'chorvátsky',                adj_f: 'chorvátska',                adj_n: 'chorvátske',                adv: 'chorvátsky' },
  { en: 'Cuba',                             sk: 'Kuba',                              gen: 'z Kuby',                                 loc: 'na Kube',                                adj_m: 'kubánsky',                  adj_f: 'kubánska',                  adj_n: 'kubánske',                  adv: 'kubánsky' },
  { en: 'Cyprus',                           sk: 'Cyprus',                            gen: 'z Cypru',                                loc: 'na Cypre',                               adj_m: 'cyperský',                  adj_f: 'cyperská',                  adj_n: 'cyperské',                  adv: 'cypersky' },
  { en: 'Czech Republic',                   sk: 'Česká republika',                   gen: 'z Českej republiky',                     loc: 'v Českej republike',                     adj_m: 'český',                     adj_f: 'česká',                     adj_n: 'české',                     adv: 'česky' },
  { en: 'Denmark',                          sk: 'Dánsko',                            gen: 'z Dánska',                               loc: 'v Dánsku',                               adj_m: 'dánsky',                    adj_f: 'dánska',                    adj_n: 'dánske',                    adv: 'dánsky' },
  { en: 'Djibouti',                         sk: 'Džibutsko',                         gen: 'z Džibutska',                            loc: 'v Džibutsku',                            adj_m: 'džibutský',                 adj_f: 'džibutská',                 adj_n: 'džibutské',                 adv: 'džibutsky' },
  { en: 'Dominica',                         sk: 'Dominika',                          gen: 'z Dominiky',                             loc: 'na Dominike',                            adj_m: 'dominický',                 adj_f: 'dominická',                 adj_n: 'dominické',                 adv: 'dominicky' },
  { en: 'Dominican Republic',               sk: 'Dominikánska republika',            gen: 'z Dominikánskej republiky',              loc: 'v Dominikánskej republike',              adj_m: 'dominikánsky',              adj_f: 'dominikánska',              adj_n: 'dominikánske',              adv: 'dominikánsky' },
  { en: 'Ecuador',                          sk: 'Ekvádor',                           gen: 'z Ekvádoru',                             loc: 'v Ekvádore',                             adj_m: 'ekvádorský',                adj_f: 'ekvádorská',                adj_n: 'ekvádorské',                adv: 'ekvádorsky' },
  { en: 'Egypt',                            sk: 'Egypt',                             gen: 'z Egypta',                               loc: 'v Egypte',                               adj_m: 'egyptský',                  adj_f: 'egyptská',                  adj_n: 'egyptské',                  adv: 'egyptsky' },
  { en: 'El Salvador',                      sk: 'Salvádor',                          gen: 'zo Salvádoru',                           loc: 'v Salvádore',                            adj_m: 'salvádorský',               adj_f: 'salvádorská',               adj_n: 'salvádorské',               adv: 'salvádorsky' },
  { en: 'Equatorial Guinea',                sk: 'Rovníková Guinea',                  gen: 'z Rovníkovej Guiney',                    loc: 'v Rovníkovej Guinei',                    adj_m: 'rovníkovoguinejský',        adj_f: 'rovníkovoguinejská',        adj_n: 'rovníkovoguinejské',        adv: 'rovníkovoguinejsky' },
  { en: 'Eritrea',                          sk: 'Eritrea',                           gen: 'z Eritrey',                              loc: 'v Eritrei',                              adj_m: 'eritrejský',                adj_f: 'eritrejská',                adj_n: 'eritrejské',                adv: 'eritrejsky' },
  { en: 'Estonia',                          sk: 'Estónsko',                          gen: 'z Estónska',                             loc: 'v Estónsku',                             adj_m: 'estónsky',                  adj_f: 'estónska',                  adj_n: 'estónske',                  adv: 'estónsky' },
  { en: 'Eswatini',                         sk: 'Eswatini',                          gen: 'z Eswatini',                             loc: 'v Eswatini',                             adj_m: 'eswatinský',                adj_f: 'eswatinská',                adj_n: 'eswatinské',                adv: 'eswatinsky' },
  { en: 'Ethiopia',                         sk: 'Etiópia',                           gen: 'z Etiópie',                              loc: 'v Etiópii',                              adj_m: 'etiópsky',                  adj_f: 'etiópska',                  adj_n: 'etiópske',                  adv: 'etiópsky' },
  { en: 'Fiji',                             sk: 'Fidži',                             gen: 'z Fidži',                                loc: 'na Fidži',                               adj_m: 'fidžijský',                 adj_f: 'fidžijská',                 adj_n: 'fidžijské',                 adv: 'fidžijsky' },
  { en: 'Finland',                          sk: 'Fínsko',                            gen: 'z Fínska',                               loc: 'vo Fínsku',                              adj_m: 'fínsky',                    adj_f: 'fínska',                    adj_n: 'fínske',                    adv: 'fínsky' },
  { en: 'France',                           sk: 'Francúzsko',                        gen: 'z Francúzska',                           loc: 'vo Francúzsku',                          adj_m: 'francúzsky',                adj_f: 'francúzska',                adj_n: 'francúzske',                adv: 'francúzsky' },
  { en: 'Gabon',                            sk: 'Gabon',                             gen: 'z Gabonu',                               loc: 'v Gabone',                               adj_m: 'gabonský',                  adj_f: 'gabonská',                  adj_n: 'gabonské',                  adv: 'gabonsky' },
  { en: 'Gambia',                           sk: 'Gambia',                            gen: 'z Gambie',                               loc: 'v Gambii',                               adj_m: 'gambijský',                 adj_f: 'gambijská',                 adj_n: 'gambijské',                 adv: 'gambijsky' },
  { en: 'Georgia',                          sk: 'Gruzínsko',                         gen: 'z Gruzínska',                            loc: 'v Gruzínsku',                            adj_m: 'gruzínsky',                 adj_f: 'gruzínska',                 adj_n: 'gruzínske',                 adv: 'gruzínsky' },
  { en: 'Germany',                          sk: 'Nemecko',                           gen: 'z Nemecka',                              loc: 'v Nemecku',                              adj_m: 'nemecký',                   adj_f: 'nemecká',                   adj_n: 'nemecké',                   adv: 'nemecky' },
  { en: 'Ghana',                            sk: 'Ghana',                             gen: 'z Ghany',                                loc: 'v Ghane',                                adj_m: 'ghanský',                   adj_f: 'ghanská',                   adj_n: 'ghanské',                   adv: 'ghansky' },
  { en: 'Greece',                           sk: 'Grécko',                            gen: 'z Grécka',                               loc: 'v Grécku',                               adj_m: 'grécky',                    adj_f: 'grécka',                    adj_n: 'grécke',                    adv: 'grécky' },
  { en: 'Grenada',                          sk: 'Grenada',                           gen: 'z Grenady',                              loc: 'na Grenade',                             adj_m: 'grenadský',                 adj_f: 'grenadská',                 adj_n: 'grenadské',                 adv: 'grenadsky' },
  { en: 'Guatemala',                        sk: 'Guatemala',                         gen: 'z Guatemaly',                            loc: 'v Guatemale',                            adj_m: 'guatemalský',               adj_f: 'guatemalská',               adj_n: 'guatemalské',               adv: 'guatemalsky' },
  { en: 'Guinea',                           sk: 'Guinea',                            gen: 'z Guiney',                               loc: 'v Guinei',                               adj_m: 'guinejský',                 adj_f: 'guinejská',                 adj_n: 'guinejské',                 adv: 'guinejsky' },
  { en: 'Guinea-Bissau',                    sk: 'Guinea-Bissau',                     gen: 'z Guiney-Bissau',                        loc: 'v Guinei-Bissau',                        adj_m: 'guinejskobissauský',        adj_f: 'guinejskobissauská',        adj_n: 'guinejskobissauské',        adv: 'guinejskobissausky' },
  { en: 'Guyana',                           sk: 'Guyana',                            gen: 'z Guyany',                               loc: 'v Guyane',                               adj_m: 'guyanský',                  adj_f: 'guyanská',                  adj_n: 'guyanské',                  adv: 'guyansky' },
  { en: 'Haiti',                            sk: 'Haiti',                             gen: 'z Haiti',                                loc: 'na Haiti',                               adj_m: 'haitský',                   adj_f: 'haitská',                   adj_n: 'haitské',                   adv: 'haitsky' },
  { en: 'Honduras',                         sk: 'Honduras',                          gen: 'z Hondurasu',                            loc: 'v Hondurase',                            adj_m: 'honduraský',                adj_f: 'honduraská',                adj_n: 'honduraské',                adv: 'hondurasky' },
  { en: 'Hungary',                          sk: 'Maďarsko',                          gen: 'z Maďarska',                             loc: 'v Maďarsku',                             adj_m: 'maďarský',                  adj_f: 'maďarská',                  adj_n: 'maďarské',                  adv: 'maďarsky' },
  { en: 'Iceland',                          sk: 'Island',                            gen: 'z Islandu',                              loc: 'na Islande',                             adj_m: 'islandský',                 adj_f: 'islandská',                 adj_n: 'islandské',                 adv: 'islandsky' },
  { en: 'India',                            sk: 'India',                             gen: 'z Indie',                                loc: 'v Indii',                                adj_m: 'indický',                   adj_f: 'indická',                   adj_n: 'indické',                   adv: 'indicky' },
  { en: 'Indonesia',                        sk: 'Indonézia',                         gen: 'z Indonézie',                            loc: 'v Indonézii',                            adj_m: 'indonézsky',                adj_f: 'indonézska',                adj_n: 'indonézske',                adv: 'indonézsky' },
  { en: 'Iran',                             sk: 'Irán',                              gen: 'z Iránu',                                loc: 'v Iráne',                                adj_m: 'iránsky',                   adj_f: 'iránska',                   adj_n: 'iránske',                   adv: 'iránsky' },
  { en: 'Iraq',                             sk: 'Irak',                              gen: 'z Iraku',                                loc: 'v Iraku',                                adj_m: 'iracký',                    adj_f: 'iracká',                    adj_n: 'iracké',                    adv: 'iracky' },
  { en: 'Ireland',                          sk: 'Írsko',                             gen: 'z Írska',                                loc: 'v Írsku',                                adj_m: 'írsky',                     adj_f: 'írska',                     adj_n: 'írske',                     adv: 'írsky' },
  { en: 'Israel',                           sk: 'Izrael',                            gen: 'z Izraela',                              loc: 'v Izraeli',                              adj_m: 'izraelský',                 adj_f: 'izraelská',                 adj_n: 'izraelské',                 adv: 'izraelsky' },
  { en: 'Italy',                            sk: 'Taliansko',                         gen: 'z Talianska',                            loc: 'v Taliansku',                            adj_m: 'taliansky',                 adj_f: 'talianska',                 adj_n: 'talianske',                 adv: 'taliansky' },
  { en: 'Jamaica',                          sk: 'Jamajka',                           gen: 'z Jamajky',                              loc: 'na Jamajke',                             adj_m: 'jamajský',                  adj_f: 'jamajská',                  adj_n: 'jamajské',                  adv: 'jamajsky' },
  { en: 'Japan',                            sk: 'Japonsko',                          gen: 'z Japonska',                             loc: 'v Japonsku',                             adj_m: 'japonský',                  adj_f: 'japonská',                  adj_n: 'japonské',                  adv: 'japonsky' },
  { en: 'Jordan',                           sk: 'Jordánsko',                         gen: 'z Jordánska',                            loc: 'v Jordánsku',                            adj_m: 'jordánsky',                 adj_f: 'jordánska',                 adj_n: 'jordánske',                 adv: 'jordánsky' },
  { en: 'Kazakhstan',                       sk: 'Kazachstan',                        gen: 'z Kazachstanu',                          loc: 'v Kazachstane',                          adj_m: 'kazašský',                  adj_f: 'kazašská',                  adj_n: 'kazašské',                  adv: 'kazašsky' },
  { en: 'Kenya',                            sk: 'Keňa',                              gen: 'z Kene',                                 loc: 'v Keni',                                 adj_m: 'kenský',                    adj_f: 'kenská',                    adj_n: 'kenské',                    adv: 'kensky' },
  { en: 'Kiribati',                         sk: 'Kiribati',                          gen: 'z Kiribati',                             loc: 'na Kiribati',                            adj_m: 'kiribatský',                adj_f: 'kiribatská',                adj_n: 'kiribatské',                adv: 'kiribatsky' },
  { en: 'Kosovo',                           sk: 'Kosovo',                            gen: 'z Kosova',                               loc: 'v Kosove',                               adj_m: 'kosovský',                  adj_f: 'kosovská',                  adj_n: 'kosovské',                  adv: 'kosovsky' },
  { en: 'Kuwait',                           sk: 'Kuvajt',                            gen: 'z Kuvajtu',                              loc: 'v Kuvajte',                              adj_m: 'kuvajtský',                 adj_f: 'kuvajtská',                 adj_n: 'kuvajtské',                 adv: 'kuvajtsky' },
  { en: 'Kyrgyzstan',                       sk: 'Kirgizsko',                         gen: 'z Kirgizska',                            loc: 'v Kirgizsku',                            adj_m: 'kirgizský',                 adj_f: 'kirgizská',                 adj_n: 'kirgizské',                 adv: 'kirgizsky' },
  { en: 'Laos',                             sk: 'Laos',                              gen: 'z Laosu',                                loc: 'v Laose',                                adj_m: 'laoský',                    adj_f: 'laoská',                    adj_n: 'laoské',                    adv: 'laosky' },
  { en: 'Latvia',                           sk: 'Lotyšsko',                          gen: 'z Lotyšska',                             loc: 'v Lotyšsku',                             adj_m: 'lotyšský',                  adj_f: 'lotyšská',                  adj_n: 'lotyšské',                  adv: 'lotyšsky' },
  { en: 'Lebanon',                          sk: 'Libanon',                           gen: 'z Libanonu',                             loc: 'v Libanone',                             adj_m: 'libanonský',                adj_f: 'libanonská',                adj_n: 'libanonské',                adv: 'libanonsky' },
  { en: 'Lesotho',                          sk: 'Lesotho',                           gen: 'z Lesotha',                              loc: 'v Lesothe',                              adj_m: 'lesothský',                 adj_f: 'lesothská',                 adj_n: 'lesothské',                 adv: 'lesothsky' },
  { en: 'Liberia',                          sk: 'Libéria',                           gen: 'z Libérie',                              loc: 'v Libérii',                              adj_m: 'libérijský',                adj_f: 'libérijská',                adj_n: 'libérijské',                adv: 'libérijsky' },
  { en: 'Libya',                            sk: 'Líbya',                             gen: 'z Líbye',                                loc: 'v Líbyi',                                adj_m: 'líbyjský',                  adj_f: 'líbyjská',                  adj_n: 'líbyjské',                  adv: 'líbyjsky' },
  { en: 'Liechtenstein',                    sk: 'Lichtenštajnsko',                   gen: 'z Lichtenštajnska',                      loc: 'v Lichtenštajnsku',                      adj_m: 'lichtenštajnský',           adj_f: 'lichtenštajnská',           adj_n: 'lichtenštajnské',           adv: 'lichtenštajnsky' },
  { en: 'Lithuania',                        sk: 'Litva',                             gen: 'z Litvy',                                loc: 'v Litve',                                adj_m: 'litovský',                  adj_f: 'litovská',                  adj_n: 'litovské',                  adv: 'litovsky' },
  { en: 'Luxembourg',                       sk: 'Luxembursko',                       gen: 'z Luxemburska',                          loc: 'v Luxembursku',                          adj_m: 'luxemburský',               adj_f: 'luxemburská',               adj_n: 'luxemburské',               adv: 'luxembursky' },
  { en: 'Madagascar',                       sk: 'Madagaskar',                        gen: 'z Madagaskaru',                          loc: 'na Madagaskare',                         adj_m: 'madagaskarský',             adj_f: 'madagaskarská',             adj_n: 'madagaskarské',             adv: 'madagaskarsky' },
  { en: 'Malawi',                           sk: 'Malawi',                            gen: 'z Malawi',                               loc: 'v Malawi',                               adj_m: 'malawijský',                adj_f: 'malawijská',                adj_n: 'malawijské',                adv: 'malawijsky' },
  { en: 'Malaysia',                         sk: 'Malajzia',                          gen: 'z Malajzie',                             loc: 'v Malajzii',                             adj_m: 'malajzijský',               adj_f: 'malajzijská',               adj_n: 'malajzijské',               adv: 'malajzijsky' },
  { en: 'Maldives',                         sk: 'Maldivy',                           gen: 'z Maldív',                               loc: 'na Maldivách',                           adj_m: 'maldivský',                 adj_f: 'maldivská',                 adj_n: 'maldivské',                 adv: 'maldivsky' },
  { en: 'Mali',                             sk: 'Mali',                              gen: 'z Mali',                                 loc: 'v Mali',                                 adj_m: 'malijský',                  adj_f: 'malijská',                  adj_n: 'malijské',                  adv: 'malijsky' },
  { en: 'Malta',                            sk: 'Malta',                             gen: 'z Malty',                                loc: 'na Malte',                               adj_m: 'maltský',                   adj_f: 'maltská',                   adj_n: 'maltské',                   adv: 'maltsky' },
  { en: 'Marshall Islands',                 sk: 'Marshallove ostrovy',               gen: 'z Marshallových ostrovov',               loc: 'na Marshallových ostrovoch',             adj_m: 'marshallský',               adj_f: 'marshallská',               adj_n: 'marshallské',               adv: 'marshallsky' },
  { en: 'Mauritania',                       sk: 'Mauritánia',                        gen: 'z Mauritánie',                           loc: 'v Mauritánii',                           adj_m: 'mauritánsky',               adj_f: 'mauritánska',               adj_n: 'mauritánske',               adv: 'mauritánsky' },
  { en: 'Mauritius',                        sk: 'Maurícius',                         gen: 'z Maurícia',                             loc: 'na Mauríciu',                          adj_m: 'maurícijský',               adj_f: 'maurícijská',               adj_n: 'maurícijské',               adv: 'maurícijsky' },
  { en: 'Mexico',                           sk: 'Mexiko',                            gen: 'z Mexika',                               loc: 'v Mexiku',                               adj_m: 'mexický',                   adj_f: 'mexická',                   adj_n: 'mexické',                   adv: 'mexicky' },
  { en: 'Micronesia',                       sk: 'Mikronézia',                        gen: 'z Mikronézie',                           loc: 'v Mikronézii',                           adj_m: 'mikronézsky',               adj_f: 'mikronézska',               adj_n: 'mikronézske',               adv: 'mikronézsky' },
  { en: 'Moldova',                          sk: 'Moldavsko',                         gen: 'z Moldavska',                            loc: 'v Moldavsku',                            adj_m: 'moldavský',                 adj_f: 'moldavská',                 adj_n: 'moldavské',                 adv: 'moldavsky' },
  { en: 'Monaco',                           sk: 'Monako',                            gen: 'z Monaka',                               loc: 'v Monaku',                               adj_m: 'monacký',                   adj_f: 'monacká',                   adj_n: 'monacké',                   adv: 'monacky' },
  { en: 'Mongolia',                         sk: 'Mongolsko',                         gen: 'z Mongolska',                            loc: 'v Mongolsku',                            adj_m: 'mongolský',                 adj_f: 'mongolská',                 adj_n: 'mongolské',                 adv: 'mongolsky' },
  { en: 'Montenegro',                       sk: 'Čierna Hora',                       gen: 'z Čiernej Hory',                         loc: 'v Čiernej Hore',                         adj_m: 'čiernohorský',              adj_f: 'čiernohorská',              adj_n: 'čiernohorské',              adv: 'čiernohorsky' },
  { en: 'Morocco',                          sk: 'Maroko',                            gen: 'z Maroka',                               loc: 'v Maroku',                               adj_m: 'marocký',                   adj_f: 'marocká',                   adj_n: 'marocké',                   adv: 'marocky' },
  { en: 'Mozambique',                       sk: 'Mozambik',                          gen: 'z Mozambiku',                            loc: 'v Mozambiku',                            adj_m: 'mozambický',                adj_f: 'mozambická',                adj_n: 'mozambické',                adv: 'mozambicky' },
  { en: 'Myanmar',                          sk: 'Mjanmarsko',                        gen: 'z Mjanmarska',                           loc: 'v Mjanmarsku',                           adj_m: 'mjanmarský',                adj_f: 'mjanmarská',                adj_n: 'mjanmarské',                adv: 'mjanmarsky' },
  { en: 'Namibia',                          sk: 'Namíbia',                           gen: 'z Namíbie',                              loc: 'v Namíbii',                              adj_m: 'namíbijský',                adj_f: 'namíbijská',                adj_n: 'namíbijské',                adv: 'namíbijsky' },
  { en: 'Nauru',                            sk: 'Nauru',                             gen: 'z Nauru',                                loc: 'na Nauru',                               adj_m: 'nauruský',                  adj_f: 'nauruská',                  adj_n: 'nauruské',                  adv: 'naurusky' },
  { en: 'Nepal',                            sk: 'Nepál',                             gen: 'z Nepálu',                               loc: 'v Nepále',                               adj_m: 'nepálsky',                  adj_f: 'nepálska',                  adj_n: 'nepálske',                  adv: 'nepálsky' },
  { en: 'Netherlands',                      sk: 'Holandsko',                         gen: 'z Holandska',                            loc: 'v Holandsku',                            adj_m: 'holandský',                 adj_f: 'holandská',                 adj_n: 'holandské',                 adv: 'holandsky' },
  { en: 'New Zealand',                      sk: 'Nový Zéland',                       gen: 'z Nového Zélandu',                       loc: 'na Novom Zélande',                       adj_m: 'novozélandský',             adj_f: 'novozélandská',             adj_n: 'novozélandské',             adv: 'novozélandsky' },
  { en: 'Nicaragua',                        sk: 'Nikaragua',                         gen: 'z Nikaraguy',                            loc: 'v Nikaragui',                            adj_m: 'nikaragujský',              adj_f: 'nikaragujská',              adj_n: 'nikaragujské',              adv: 'nikaragujsky' },
  { en: 'Niger',                            sk: 'Niger',                             gen: 'z Nigeru',                               loc: 'v Nigeri',                               adj_m: 'nigerský',                  adj_f: 'nigerská',                  adj_n: 'nigerské',                  adv: 'nigersky' },
  { en: 'Nigeria',                          sk: 'Nigéria',                           gen: 'z Nigérie',                              loc: 'v Nigérii',                              adj_m: 'nigerijský',                adj_f: 'nigerijská',                adj_n: 'nigerijské',                adv: 'nigerijsky' },
  { en: 'North Korea',                      sk: 'Severná Kórea',                     gen: 'zo Severnej Kórey',                      loc: 'v Severnej Kórei',                       adj_m: 'severokórejský',            adj_f: 'severokórejská',            adj_n: 'severokórejské',            adv: 'severokórejsky' },
  { en: 'North Macedonia',                  sk: 'Severné Macedónsko',                gen: 'zo Severného Macedónska',                loc: 'v Severnom Macedónsku',                  adj_m: 'severomacedónsky',          adj_f: 'severomacedónska',          adj_n: 'severomacedónske',          adv: 'severomacedónsky' },
  { en: 'Norway',                           sk: 'Nórsko',                            gen: 'z Nórska',                               loc: 'v Nórsku',                               adj_m: 'nórsky',                    adj_f: 'nórska',                    adj_n: 'nórske',                    adv: 'nórsky' },
  { en: 'Oman',                             sk: 'Omán',                              gen: 'z Ománu',                                loc: 'v Ománe',                                adj_m: 'ománsky',                   adj_f: 'ománska',                   adj_n: 'ománske',                   adv: 'ománsky' },
  { en: 'Pakistan',                         sk: 'Pakistan',                          gen: 'z Pakistanu',                            loc: 'v Pakistane',                            adj_m: 'pakistanský',               adj_f: 'pakistanská',               adj_n: 'pakistanské',               adv: 'pakistansky' },
  { en: 'Palau',                            sk: 'Palau',                             gen: 'z Palau',                                loc: 'na Palau',                               adj_m: 'palauský',                  adj_f: 'palauská',                  adj_n: 'palauské',                  adv: 'palausky' },
  { en: 'Palestine',                        sk: 'Palestína',                         gen: 'z Palestíny',                            loc: 'v Palestíne',                            adj_m: 'palestínsky',               adj_f: 'palestínska',               adj_n: 'palestínske',               adv: 'palestínsky' },
  { en: 'Panama',                           sk: 'Panama',                            gen: 'z Panamy',                               loc: 'v Paname',                               adj_m: 'panamský',                  adj_f: 'panamská',                  adj_n: 'panamské',                  adv: 'panamsky' },
  { en: 'Papua New Guinea',                 sk: 'Papua-Nová Guinea',                 gen: 'z Papuy-Novej Guiney',                   loc: 'v Papue-Novej Guinei',                   adj_m: 'papuánsky',                 adj_f: 'papuánska',                 adj_n: 'papuánske',                 adv: 'papuánsky' },
  { en: 'Paraguay',                         sk: 'Paraguaj',                          gen: 'z Paraguaja',                            loc: 'v Paraguaji',                            adj_m: 'paraguajský',               adj_f: 'paraguajská',               adj_n: 'paraguajské',               adv: 'paraguajsky' },
  { en: 'Peru',                             sk: 'Peru',                              gen: 'z Peru',                                 loc: 'v Peru',                                 adj_m: 'peruánsky',                 adj_f: 'peruánska',                 adj_n: 'peruánske',                 adv: 'peruánsky' },
  { en: 'Philippines',                      sk: 'Filipíny',                          gen: 'z Filipín',                              loc: 'na Filipínach',                          adj_m: 'filipínsky',                adj_f: 'filipínska',                adj_n: 'filipínske',                adv: 'filipínsky' },
  { en: 'Poland',                           sk: 'Poľsko',                            gen: 'z Poľska',                               loc: 'v Poľsku',                               adj_m: 'poľský',                    adj_f: 'poľská',                    adj_n: 'poľské',                    adv: 'poľsky' },
  { en: 'Portugal',                         sk: 'Portugalsko',                       gen: 'z Portugalska',                          loc: 'v Portugalsku',                          adj_m: 'portugalský',               adj_f: 'portugalská',               adj_n: 'portugalské',               adv: 'portugalsky' },
  { en: 'Qatar',                            sk: 'Katar',                             gen: 'z Kataru',                               loc: 'v Katare',                               adj_m: 'katarský',                  adj_f: 'katarská',                  adj_n: 'katarské',                  adv: 'katarsky' },
  { en: 'Romania',                          sk: 'Rumunsko',                          gen: 'z Rumunska',                             loc: 'v Rumunsku',                             adj_m: 'rumunský',                  adj_f: 'rumunská',                  adj_n: 'rumunské',                  adv: 'rumunsky' },
  { en: 'Russia',                           sk: 'Rusko',                             gen: 'z Ruska',                                loc: 'v Rusku',                                adj_m: 'ruský',                     adj_f: 'ruská',                     adj_n: 'ruské',                     adv: 'rusky' },
  { en: 'Rwanda',                           sk: 'Rwanda',                            gen: 'z Rwandy',                               loc: 'vo Rwande',                              adj_m: 'rwandský',                  adj_f: 'rwandská',                  adj_n: 'rwandské',                  adv: 'rwandsky' },
  { en: 'Saint Kitts and Nevis',            sk: 'Svätý Krištof a Nevis',             gen: 'zo Svätého Krištofa a Nevisu',           loc: 'na Svätom Krištofovi a Nevise',          adj_m: 'svätokrištofský',           adj_f: 'svätokrištofská',           adj_n: 'svätokrištofské',           adv: 'svätokrištofsky' },
  { en: 'Saint Lucia',                      sk: 'Svätá Lucia',                       gen: 'zo Svätej Lucie',                        loc: 'na Svätej Lucii',                        adj_m: 'svätolucijský',             adj_f: 'svätolucijská',             adj_n: 'svätolucijské',             adv: 'svätolucijsky' },
  { en: 'Saint Vincent and the Grenadines', sk: 'Svätý Vincent a Grenadíny',         gen: 'zo Svätého Vincenta a Grenadín',         loc: 'na Svätom Vincentovi a Grenadínach',     adj_m: 'svätovincenský',            adj_f: 'svätovincenská',            adj_n: 'svätovincenské',            adv: 'svätovincensky' },
  { en: 'Samoa',                            sk: 'Samoa',                             gen: 'z Samoy',                                loc: 'na Samoe',                               adj_m: 'samojský',                  adj_f: 'samojská',                  adj_n: 'samojské',                  adv: 'samojsky' },
  { en: 'San Marino',                       sk: 'San Maríno',                        gen: 'z San Marína',                           loc: 'v San Maríne',                           adj_m: 'sanmarínsky',               adj_f: 'sanmarínska',               adj_n: 'sanmarínske',               adv: 'sanmarínsky' },
  { en: 'São Tomé and Príncipe',            sk: 'Svätý Tomáš a Princov ostrov',      gen: 'zo Svätého Tomáša a Princovho ostrova', loc: 'na Svätom Tomášovi a Princovom ostrove', adj_m: 'svätotomášsky',             adj_f: 'svätotomášska',             adj_n: 'svätotomášske',             adv: 'svätotomášsky' },
  { en: 'Saudi Arabia',                     sk: 'Saudská Arábia',                    gen: 'z Saudskej Arábie',                      loc: 'v Saudskej Arábii',                      adj_m: 'saudskoarabský',            adj_f: 'saudskoarabská',            adj_n: 'saudskoarabské',            adv: 'saudskoarabsky' },
  { en: 'Senegal',                          sk: 'Senegal',                           gen: 'z Senegalu',                             loc: 'v Senegale',                             adj_m: 'senegalský',                adj_f: 'senegalská',                adj_n: 'senegalské',                adv: 'senegalsky' },
  { en: 'Serbia',                           sk: 'Srbsko',                            gen: 'zo Srbska',                              loc: 'v Srbsku',                               adj_m: 'srbský',                    adj_f: 'srbská',                    adj_n: 'srbské',                    adv: 'srbsky' },
  { en: 'Seychelles',                       sk: 'Seychely',                          gen: 'zo Seychel',                             loc: 'na Seychelách',                          adj_m: 'seychelský',                adj_f: 'seychelská',                adj_n: 'seychelské',                adv: 'seychelsky' },
  { en: 'Sierra Leone',                     sk: 'Sierra Leone',                      gen: 'z Sierra Leone',                         loc: 'v Sierra Leone',                         adj_m: 'sierraleonský',             adj_f: 'sierraleonská',             adj_n: 'sierraleonské',             adv: 'sierraleonsky' },
  { en: 'Singapore',                        sk: 'Singapur',                          gen: 'z Singapuru',                            loc: 'v Singapure',                            adj_m: 'singapurský',               adj_f: 'singapurská',               adj_n: 'singapurské',               adv: 'singapursky' },
  { en: 'Slovakia',                         sk: 'Slovensko',                         gen: 'zo Slovenska',                           loc: 'na Slovensku',                           adj_m: 'slovenský',                 adj_f: 'slovenská',                 adj_n: 'slovenské',                 adv: 'slovensky', disabled: true },
  { en: 'Slovenia',                         sk: 'Slovinsko',                         gen: 'zo Slovinska',                           loc: 'v Slovinsku',                            adj_m: 'slovinský',                 adj_f: 'slovinská',                 adj_n: 'slovinské',                 adv: 'slovinsky' },
  { en: 'Solomon Islands',                  sk: 'Šalamúnove ostrovy',                gen: 'zo Šalamúnových ostrovov',               loc: 'na Šalamúnových ostrovoch',              adj_m: 'šalamúnsky',                adj_f: 'šalamúnska',                adj_n: 'šalamúnske',                adv: 'šalamúnsky' },
  { en: 'Somalia',                          sk: 'Somálsko',                          gen: 'zo Somálska',                            loc: 'v Somálsku',                             adj_m: 'somálsky',                  adj_f: 'somálska',                  adj_n: 'somálske',                  adv: 'somálsky' },
  { en: 'South Africa',                     sk: 'Južná Afrika',                      gen: 'z Južnej Afriky',                        loc: 'v Južnej Afrike',                        adj_m: 'juhoafrický',               adj_f: 'juhoafrická',               adj_n: 'juhoafrické',               adv: 'juhoafricky' },
  { en: 'South Korea',                      sk: 'Južná Kórea',                       gen: 'z Južnej Kórey',                         loc: 'v Južnej Kórei',                         adj_m: 'juhokórejský',              adj_f: 'juhokórejská',              adj_n: 'juhokórejské',              adv: 'juhokórejsky' },
  { en: 'South Sudan',                      sk: 'Južný Sudán',                       gen: 'z Južného Sudánu',                       loc: 'v Južnom Sudáne',                        adj_m: 'juhosudánsky',              adj_f: 'juhosudánska',              adj_n: 'juhosudánske',              adv: 'juhosudánsky' },
  { en: 'Spain',                            sk: 'Španielsko',                        gen: 'zo Španielska',                          loc: 'vo Španielsku',                          adj_m: 'španielsky',                adj_f: 'španielska',                adj_n: 'španielske',                adv: 'španielsky' },
  { en: 'Sri Lanka',                        sk: 'Srí Lanka',                         gen: 'zo Srí Lanky',                           loc: 'na Srí Lanke',                           adj_m: 'srílančský',                adj_f: 'srílančská',                adj_n: 'srílančské',                adv: 'srílančsky' },
  { en: 'Sudan',                            sk: 'Sudán',                             gen: 'z Sudánu',                               loc: 'v Sudáne',                               adj_m: 'sudánsky',                  adj_f: 'sudánska',                  adj_n: 'sudánske',                  adv: 'sudánsky' },
  { en: 'Suriname',                         sk: 'Surinam',                           gen: 'z Surinamu',                             loc: 'v Suriname',                             adj_m: 'surinamský',                adj_f: 'surinamská',                adj_n: 'surinamské',                adv: 'surinamsky' },
  { en: 'Sweden',                           sk: 'Švédsko',                           gen: 'zo Švédska',                             loc: 'vo Švédsku',                             adj_m: 'švédsky',                   adj_f: 'švédska',                   adj_n: 'švédske',                   adv: 'švédsky' },
  { en: 'Switzerland',                      sk: 'Švajčiarsko',                       gen: 'zo Švajčiarska',                         loc: 'vo Švajčiarsku',                         adj_m: 'švajčiarsky',               adj_f: 'švajčiarska',               adj_n: 'švajčiarske',               adv: 'švajčiarsky' },
  { en: 'Syria',                            sk: 'Sýria',                             gen: 'zo Sýrie',                               loc: 'v Sýrii',                                adj_m: 'sýrsky',                    adj_f: 'sýrska',                    adj_n: 'sýrske',                    adv: 'sýrsky' },
  { en: 'Taiwan',                           sk: 'Taiwan',                            gen: 'z Taiwanu',                              loc: 'na Taiwane',                             adj_m: 'taiwanský',                 adj_f: 'taiwanská',                 adj_n: 'taiwanské',                 adv: 'taiwansky' },
  { en: 'Tajikistan',                       sk: 'Tadžikistan',                       gen: 'z Tadžikistanu',                         loc: 'v Tadžikistane',                         adj_m: 'tadžický',                  adj_f: 'tadžická',                  adj_n: 'tadžické',                  adv: 'tadžicky' },
  { en: 'Tanzania',                         sk: 'Tanzánia',                          gen: 'z Tanzánie',                             loc: 'v Tanzánii',                             adj_m: 'tanzánsky',                 adj_f: 'tanzánska',                 adj_n: 'tanzánske',                 adv: 'tanzánsky' },
  { en: 'Thailand',                         sk: 'Thajsko',                           gen: 'z Thajska',                              loc: 'v Thajsku',                              adj_m: 'thajský',                   adj_f: 'thajská',                   adj_n: 'thajské',                   adv: 'thajsky' },
  { en: 'Timor-Leste',                      sk: 'Východný Timor',                    gen: 'z Východného Timoru',                    loc: 'vo Východnom Timore',                    adj_m: 'východotimorský',           adj_f: 'východotimorská',           adj_n: 'východotimorské',           adv: 'východotimorsky' },
  { en: 'Togo',                             sk: 'Togo',                              gen: 'z Toga',                                 loc: 'v Togu',                                 adj_m: 'togský',                    adj_f: 'togská',                    adj_n: 'togské',                    adv: 'togsky' },
  { en: 'Tonga',                            sk: 'Tonga',                             gen: 'z Tongy',                                loc: 'na Tonge',                               adj_m: 'tongský',                   adj_f: 'tongská',                   adj_n: 'tongské',                   adv: 'tongsky' },
  { en: 'Trinidad and Tobago',              sk: 'Trinidad a Tobago',                 gen: 'z Trinidadu a Tobaga',                   loc: 'na Trinidade a Tobagu',                  adj_m: 'trinidadský',               adj_f: 'trinidadská',               adj_n: 'trinidadské',               adv: 'trinidadsky' },
  { en: 'Tunisia',                          sk: 'Tunisko',                           gen: 'z Tuniska',                              loc: 'v Tunisku',                              adj_m: 'tuniský',                   adj_f: 'tuniská',                   adj_n: 'tuniské',                   adv: 'tunisky' },
  { en: 'Turkey',                           sk: 'Turecko',                           gen: 'z Turecka',                              loc: 'v Turecku',                              adj_m: 'turecký',                   adj_f: 'turecká',                   adj_n: 'turecké',                   adv: 'turecky' },
  { en: 'Turkmenistan',                     sk: 'Turkménsko',                        gen: 'z Turkménska',                           loc: 'v Turkménsku',                           adj_m: 'turkménsky',                adj_f: 'turkménska',                adj_n: 'turkménske',                adv: 'turkménsky' },
  { en: 'Tuvalu',                           sk: 'Tuvalu',                            gen: 'z Tuvalu',                               loc: 'na Tuvalu',                              adj_m: 'tuvalský',                  adj_f: 'tuvalská',                  adj_n: 'tuvalské',                  adv: 'tuvalsky' },
  { en: 'Uganda',                           sk: 'Uganda',                            gen: 'z Ugandy',                               loc: 'v Ugande',                               adj_m: 'ugandský',                  adj_f: 'ugandská',                  adj_n: 'ugandské',                  adv: 'ugandsky' },
  { en: 'Ukraine',                          sk: 'Ukrajina',                          gen: 'z Ukrajiny',                             loc: 'na Ukrajine',                            adj_m: 'ukrajinský',                adj_f: 'ukrajinská',                adj_n: 'ukrajinské',                adv: 'ukrajinsky' },
  { en: 'United Arab Emirates',             sk: 'Spojené arabské emiráty',           gen: 'zo Spojených arabských emirátov',        loc: 'v Spojených arabských emirátoch',        adj_m: 'emirátsky',                 adj_f: 'emirátska',                 adj_n: 'emirátske',                 adv: 'emirátsky' },
  { en: 'United Kingdom',                   sk: 'Spojené kráľovstvo',                gen: 'zo Spojeného kráľovstva',                loc: 'v Spojenom kráľovstve',                  adj_m: 'britský',                   adj_f: 'britská',                   adj_n: 'britské',                   adv: 'britsky' },
  { en: 'United States',                    sk: 'Spojené štáty americké',            gen: 'zo Spojených štátov amerických',         loc: 'v Spojených štátoch amerických',         adj_m: 'americký',                  adj_f: 'americká',                  adj_n: 'americké',                  adv: 'americky' },
  { en: 'Uruguay',                          sk: 'Uruguaj',                           gen: 'z Uruguaja',                             loc: 'v Uruguaji',                             adj_m: 'uruguajský',                adj_f: 'uruguajská',                adj_n: 'uruguajské',                adv: 'uruguajsky' },
  { en: 'Uzbekistan',                       sk: 'Uzbekistan',                        gen: 'z Uzbekistanu',                          loc: 'v Uzbekistane',                          adj_m: 'uzbecký',                   adj_f: 'uzbecká',                   adj_n: 'uzbecké',                   adv: 'uzbecky' },
  { en: 'Vanuatu',                          sk: 'Vanuatu',                           gen: 'z Vanuatu',                              loc: 'na Vanuatu',                             adj_m: 'vanuatský',                 adj_f: 'vanuatská',                 adj_n: 'vanuatské',                 adv: 'vanuatsky' },
  { en: 'Vatican City',                     sk: 'Vatikán',                           gen: 'z Vatikánu',                             loc: 'vo Vatikáne',                            adj_m: 'vatikánsky',                adj_f: 'vatikánska',                adj_n: 'vatikánske',                adv: 'vatikánsky' },
  { en: 'Venezuela',                        sk: 'Venezuela',                         gen: 'z Venezuely',                            loc: 'vo Venezuele',                           adj_m: 'venezuelský',               adj_f: 'venezuelská',               adj_n: 'venezuelské',               adv: 'venezuelsky' },
  { en: 'Vietnam',                          sk: 'Vietnam',                           gen: 'z Vietnamu',                             loc: 'vo Vietname',                            adj_m: 'vietnamský',                adj_f: 'vietnamská',                adj_n: 'vietnamské',                adv: 'vietnamsky' },
  { en: 'Yemen',                            sk: 'Jemen',                             gen: 'z Jemenu',                               loc: 'v Jemene',                               adj_m: 'jemenský',                  adj_f: 'jemenská',                  adj_n: 'jemenské',                  adv: 'jemensky' },
  { en: 'Zambia',                           sk: 'Zambia',                            gen: 'zo Zambie',                              loc: 'v Zambii',                               adj_m: 'zambijský',                 adj_f: 'zambijská',                 adj_n: 'zambijské',                 adv: 'zambijsky' },
  { en: 'Zimbabwe',                         sk: 'Zimbabwe',                          gen: 'zo Zimbabwe',                            loc: 'v Zimbabwe',                             adj_m: 'zimbabwský',                adj_f: 'zimbabwská',                adj_n: 'zimbabwské',                adv: 'zimbabwsky' },
];

interface Props {
  userId: string;
  onDone: () => void;
}

export function OnboardingModal({ userId, onDone }: Props) {
  const [step, setStep]       = useState<'country' | 'gender'>('country');
  const [country, setCountry] = useState<Country | null>(null);
  const [gender, setGender]   = useState('');
  const [search, setSearch]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return COUNTRIES.filter(
      (c) => c.en.toLowerCase().includes(q) || c.sk.toLowerCase().includes(q),
    );
  }, [search]);

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    setStep('gender');
  };

  const handleSubmit = async () => {
    if (!country || !gender || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding(
        userId,
        country.en, country.sk,
        country.gen, country.loc,
        country.adj_m, country.adj_f, country.adj_n, country.adv,
        gender,
      );
      onDone();
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  // ── Step 1: Country ──────────────────────────────────────────────────────────
  if (step === 'country') {
    return (
      <div className="fixed inset-0 z-[85] bg-[#E8F4DC] flex flex-col">
        <div className="px-5 pt-12 pb-4 text-center flex-none">
          <img src="/snail.png" alt="" className="w-16 h-16 mx-auto mb-3 object-contain" />
          <h2 className="text-xl font-extrabold text-gray-800">Where are you from?</h2>
          <p className="text-xs text-gray-500 mt-1 leading-snug">
            Helps us build lessons that make sense for your background
          </p>
        </div>

        <div className="px-4 pb-3 flex-none">
          <input
            type="text"
            placeholder="Search country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm outline-none focus:border-brand-green transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center pt-6">No results for "{search}"</p>
          ) : (
            filtered.map((c) =>
              c.disabled ? (
                <div
                  key={c.en}
                  className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <span className="block text-sm font-semibold text-gray-400">{c.en}</span>
                    <span className="block text-xs text-gray-400 mt-0.5">{c.sk}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-medium shrink-0 ml-2">Host country</span>
                </div>
              ) : (
                <button
                  key={c.en}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-100 bg-white hover:border-brand-green hover:bg-green-50 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span className="block text-sm font-semibold text-gray-800">{c.en}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">{c.sk}</span>
                </button>
              )
            )
          )}
        </div>
      </div>
    );
  }

  // ── Step 2: Gender ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[85] bg-[#E8F4DC] flex flex-col items-center justify-center px-6">
      <img src="/snail.png" alt="" className="w-16 h-16 mb-4 object-contain" />
      <h2 className="text-xl font-extrabold text-gray-800 mb-1 text-center">What's your gender?</h2>
      <p className="text-xs text-gray-500 mb-2 text-center leading-snug">
        Used to personalise lesson dialogue and examples
      </p>

      <button
        type="button"
        onClick={() => setStep('country')}
        className="mb-6 flex items-center gap-1.5 text-xs text-brand-green font-semibold cursor-pointer hover:underline"
      >
        ← {country?.en}
      </button>

      <div className="w-full max-w-sm space-y-3">
        {(['Male', 'Female'] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGender(g)}
            className={`w-full py-4 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer active:scale-[0.98] ${
              gender === g
                ? 'border-brand-green bg-green-50 text-brand-green'
                : 'border-gray-200 bg-white text-gray-700 hover:border-brand-green hover:bg-green-50'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-red-500 font-semibold text-center">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!gender || saving}
        className={`mt-8 w-full max-w-sm py-3.5 rounded-xl font-extrabold text-sm transition-all ${
          gender && !saving
            ? 'bg-brand-green text-white hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {saving ? 'Saving…' : 'Continue'}
      </button>
    </div>
  );
}
