const ALLOWED_ORIGIN = "https://mohamedkhaled700612-cpu.github.io";
const MODEL = "google/gemini-3.7-flash";
const SYSTEM_PROMPT = `أنت Batanoon AI 2.0، مساعد تعليمي لمنصة مدرسة البتانون الثانوية المطورة في مصر.
قواعد إلزامية:
1) أجب بالعربية المصرية الواضحة، وراعِ الصف الدراسي الذي يرسله النظام.
2) بيانات الأخبار والجداول والملفات والأسئلة المرفقة في السياق هي بيانات المدرسة. لا تخترع مواعيد أو نتائج أو روابط أو قرارات رسمية.
3) ميّز بوضوح بين "معلومة رسمية من بيانات المنصة" و"شرح تعليمي عام". لا تصف أي معلومة بأنها رسمية إلا إذا وردت في سياق بيانات المنصة.
4) إذا لم تجد معلومة إدارية/رسمية في البيانات، قل إنها غير موجودة في البيانات الحالية ووجّه الطالب لتبويب تواصل. لا تخمّن.
5) في الشرح العلمي والرياضي، اشرح خطوة بخطوة وتحقق من الحسابات، واطلب توضيحًا إذا كانت صورة السؤال غير مقروءة.
6) عند إنشاء اختبار، لا تعرض نموذج الإجابة قبل محاولة الطالب. نوّع الأسئلة وحدد الدرجة بوضوح.
7) عند التصحيح، لا تخترع إجابة نموذجية من بنك الأسئلة إن لم تكن موجودة؛ اشرح أن التصحيح تقديري إذا لم يوجد نموذج معتمد.
8) عند تحليل الصور، اقرأ السؤال والرسوم الظاهرة فقط، واذكر أي جزء غير واضح بدل التخمين.
9) لا تكشف بيانات شخصية أو سجلات طلاب أو شكاوى. لا تطلب كلمات مرور أو بيانات حساسة.
10) كن صريحًا بشأن عدم اليقين، ولا تدّعِ أنك نفذت إجراءً داخل الموقع.`;
function cors(origin){return {'Access-Control-Allow-Origin':origin===ALLOWED_ORIGIN?origin:ALLOWED_ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Content-Type':'application/json; charset=utf-8'};}
function json(data,status,origin){return new Response(JSON.stringify(data),{status,headers:cors(origin)});}
export default {
 async fetch(request, env){
  const origin=request.headers.get('Origin')||'';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(origin!==ALLOWED_ORIGIN)return json({error:'Origin not allowed'},403,origin);
  const url=new URL(request.url);
  if(request.method!=='POST'||url.pathname!=='/chat')return json({error:'Not found'},404,origin);
  if(!env.POLLINATIONS_API_KEY)return json({error:'مفتاح Pollinations غير مضبوط في Cloudflare Secrets'},503,origin);
  let raw;try{raw=await request.text();}catch{return json({error:'Invalid request'},400,origin);}
  if(raw.length>8_000_000)return json({error:'حجم الطلب أكبر من المسموح'},413,origin);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'JSON غير صالح'},400,origin);}
  if(!Array.isArray(body.messages)||!body.messages.length||body.messages.length>12)return json({error:'سجل المحادثة غير صالح'},400,origin);
  const gradeNames={'1':'الأول الثانوي','2':'الثاني الثانوي','3':'الثالث الثانوي'};
  const grade=gradeNames[String(body.grade)]||'غير محدد';
  const messages=body.messages.map((m)=>{
    if(!m||!['user','assistant'].includes(m.role))throw new Error('Invalid role');
    let content=m.content;
    if(typeof content==='string')content=content.slice(0,22000);
    else if(Array.isArray(content))content=content.map(part=>{
      if(part.type==='text')return {type:'text',text:String(part.text||'').slice(0,22000)};
      if(part.type==='image_url'&&part.image_url&&typeof part.image_url.url==='string'&&part.image_url.url.startsWith('data:image/')){
        if(part.image_url.url.length>7_000_000)throw new Error('Image too large');
        return {type:'image_url',image_url:{url:part.image_url.url,detail:'high'}};
      }
      throw new Error('Unsupported content');
    });
    else throw new Error('Invalid content');
    return {role:m.role,content};
  });
  try{
    const response=await fetch('https://gen.pollinations.ai/v1/chat/completions',{
      method:'POST',headers:{'Authorization':`Bearer ${env.POLLINATIONS_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:MODEL,messages:[{role:'system',content:`${SYSTEM_PROMPT}\nالصف الدراسي الحالي: ${grade}.`},...messages],max_tokens:1800,temperature:0.35})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)return json({error:data.error?.message||data.message||`Pollinations error ${response.status}`},502,origin);
    const answer=data.choices?.[0]?.message?.content;
    if(!answer)return json({error:'لم يرجع النموذج إجابة نصية'},502,origin);
    const hasSchoolData=messages.some(m=>JSON.stringify(m.content).includes('بيانات المنصة الرسمية'));
    return json({answer,source:'بيانات المدرسة: يستخدم المساعد ما توفر في قاعدة بيانات المنصة فقط. الشرح الدراسي: محتوى تعليمي مولّد بالذكاء الاصطناعي وليس اعتمادًا رسميًا من الوزارة.'},200,origin);
  }catch(e){return json({error:e.message||'تعذر الاتصال بخدمة الذكاء الاصطناعي'},502,origin);}
 }
};
