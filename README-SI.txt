CHATHURANGANI BUSINESS MANAGER – VERSION 2
===========================================

මෙය ආරම්භක සංස්කරණයකි. Firebase project එකට සම්බන්ධ කර, rules පරීක්ෂා කර,
උදාහරණ දත්ත සමඟ test කළ පසුව පමණක් සැබෑ ව්‍යාපාර දත්ත ඇතුළත් කරන්න.

1. ZIP එක Extract කරන්න.
2. firebase-config.js Notepad එකෙන් විවෘත කරන්න.
3. Firebase Console > Project settings > General > Your apps > SDK setup and configuration
   යටතේ ඇති Web App config අගයන් පමණක් අදාළ තැන්වලට දාන්න.
   Config එක chat එකට, Facebook එකට හෝ වෙනත් අයට යවන්න එපා.
4. Firebase Authentication තුළ Email/Password enabled බව බලන්න.
5. Firebase Authentication > Users තුළ Owner user එකක් සාදන්න.
6. Firestore Database > users collection තුළ Document ID එකට Owner UID එක දාන්න.
   Fields:
     role  (string)  owner
     email (string)  ownerගේ email
7. Firestore > Rules තුළ firestore.rules ගොනුවේ නීති paste කර Publish කරන්න.
8. Employee කෙනෙක් එක් කළ විට Firebase Authentication තුළ user එක සාදා,
   users collection තුළ එම UID එකට role (string) = employee සහ email (string) එකතු කරන්න.
   Role document එක client app එකෙන් වෙනස් කළ නොහැක.
9. HTTPS hosting අවශ්‍යයි. Local test සඳහා:
     CMD විවෘත කරන්න
     cd /d "ඔබගේ folder එකේ සම්පූර්ණ path එක"
     py -m http.server 8000
   Chrome තුළ http://localhost:8000/index.html нэ.
   CMD කවුළ੍ਹුව වසා නොදමන්න.
10. Public HTTPS hosting සඳහා Firebase Hosting හෝ වෙනත් hosting භාවිත කළ හැක.
    GitHub Pages භාවිත කරනවා නම් firebase-config.js public file එකක් බව මතක තබාගන්න.
    Firebase Web API config සාමාන්‍යයෙන් public identifier එකක් වුවත්,
    Firestore Security Rules සහ Authentication ආරක්ෂාව අත්‍යවශ්‍යයි.

ආරක්ෂාව / සීමාවන්:
- Firebase config තුළ private service-account key එකක් කිසිවිටෙක දාන්න එපා.
- Password, OTP, recovery code හෝ bank details share කරන්න එපා.
- Owner / Employee permissions Firestore Rules මඟින් පාලනය වේ.
- Employee role එකට financial collections, sales, expenses, fuel, savings, reports,
  analytics සහ employee management ප්‍රවේශය අවහිර කර ඇත.
- Employee delivery records කියවීමට assignedTo field එක employee UID එක විය යුතුය.
- Employee collection records තමන් නිර්මාණය කළ ඒවා පමණක් කියවිය හැක.
- මෙය පළමු prototype එකකි. Owner/employee rules live data සමඟ පරීක්ෂා කරගන්න.
- මෙම prototype එකේ සම්පූර්ණ මාසික financial calculations, charts, advanced reports,
  delivery reminders, map pins, push notifications, stock control, edit/delete UI,
  payroll සහ automated WhatsApp orders තවම සම්පූර්ණ කර නැත.
- App එකේ පෙන්වන sales profit ගණනය product එකේ saved unitCost මත පදනම් වේ.
  Unit cost වෙනස් කළහොත් පැරණි විකුණුම්වල cost snapshots පැරණි අගයෙන්ම තබාගන්න.
- Living expense / savings entries යනු allocation සහ tracking සටහන්ය.
  එකම මුදල income/expense ලෙස දෙවරක් සටහන් නොකරන්න.
- Cloud data access සඳහා internet අවශ්‍යයි. Service worker එක shell files cache කරයි;
  මෙය Firestore offline sync එකක් නොවේ.
- Firebase Spark plan limits තිබේ. Blaze billing enable කිරීමට පෙර දෙමාපියෙකු/භාරකරු සමඟ
  ගාස්තු සහ අවශ්‍යතා පරීක්ෂා කරන්න.

ආරම්භක නිෂ්පාදන:
BLOOM MILK 200ml – LKR 200
Fruit Drink Ice Packets – LKR 15 each / 20 pack LKR 330
Fruit & Nut Ice Cream – LKR 120
Jelly Pudding – LKR 120

ආරම්භක product costs, bottle, label, sugar, electricity සහ petrol අගයන්
තාවකාලික ඇස්තමේන්තු පමණි. සැබෑ බිල්පත් හා මිල ගණන් අනුව යාවත්කාලීන කරන්න.
