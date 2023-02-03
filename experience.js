const baseUrl = `https://intra.epitech.eu`;

const Activities = {
    TALK: 'Talk',
    WORKSHOP: 'Workshop',
    HACKATHON: 'Hackathon',
    EXPERIENCE: 'Experience'
}

const Status = {
    SOON: 'soon',
    ORGANIZER: 'organizer',
    PRESENT: 'present',
    ABSENT: 'absent',
    REGISTERED: 'registered',
    NON_APPLICABLE: 'N/A'
}

const xpAct = new Map();
xpAct.set(Activities.TALK, {
    name: 'Talk',
    xpWinPart: 1,
    xpWinOrg: 4,
    xpLostPart: 1,
    limitPart: 15,
    limitOrg: 6,
    nbPart: 0,
    nbOrg: 0
});
xpAct.set(Activities.WORKSHOP, {
    name: 'Workshop',
    xpWinPart: 2,
    xpWinOrg: 7,
    xpLostPart: 2,
    limitPart: 10,
    limitOrg: 3,
    nbPart: 0,
    nbOrg: 0
});
xpAct.set(Activities.HACKATHON, {
    name: 'Hackathon',
    xpWinPart: 6,
    xpWinOrg: 15,
    xpLostPart: 6,
    limitPart: 100,
    limitOrg: 100,
    nbPart: 0,
    nbOrg: 0
});
xpAct.set(Activities.EXPERIENCE, {
    name: 'Experience',
    xpWinPart: 3,
    xpWinOrg: 0,
    xpLostPart: 0,
    limitPart: 8,
    limitOrg: 0,
    nbPart: 0,
    nbOrg: 0,
});

let participation = {
    talk: 0,
    experience: 0,
    workshop: 0,
    hackathon: 0,
    talksoon: 0,
    workshopsoon: 0,
    hackathonsoon: 0,
}
let organization = {
    talk: 0,
    workshop: 0,
    hackathon: 0,
    talksoon: 0,
    workshopsoon: 0,
    hackathonsoon: 0,
}

let year = 2022;

const me = {nbXps: 0, nbXpsSoon: 0, present: [], absent: [], soon: [], "N/A": []};

const requestGet = async (url) => {
    let data;

    try {
        const res = await fetch(url, {
            method: 'GET',
            credentials: 'include',
        });
        data = await res.json();
    } catch (e) {
        console.log(e);
        throw 'Invalid request';
    }
    return data;
};

const getProfil = async () => {
    return await requestGet(`${baseUrl}/user/?format=json`);
};

const getActivitiesHub = async (region) => {
    return await requestGet(`${baseUrl}/module/${year}/B-INN-000/${region}-0-1/?format=json`);
};

const getRunExperiences = async (activities, url, login) => {
    try {
        let res = await Promise.all(
            activities.map((act) => {
                return fetch(`${url}/${act?.codeacti}/project/?format=json`, {
                    method: 'GET',
                    credentials: 'include',
                });
            })
        );
        res = await Promise.all(
            res?.map((result) => {
                return result.json();
            }),
        );
        res?.forEach((project) => {
            const user = project.registered.find((register) => register.master.login === login);
            if (!user)
                return;
            addActivite('Experience', 'Experience', 'present', project?.date);
        });
    } catch (e) {
        console.log(e);
    }
}

const getAllExperiences = async (activities, region, login) => {
    const regionSub = region?.split('/')[1];
    const url = `${baseUrl}/module/${year}/B-INN-000/${regionSub}-0-1`;
    if (regionSub === 'RUN')
        return await getRunExperiences(activities, url, login)
    try {
        let res = await Promise.all(
            activities.map((act) => {
                return fetch(`${url}/${act?.codeacti}/note/?format=json`, {
                    method: 'GET',
                    credentials: 'include',
                });
            }),
        );
        res = await Promise.all(
            res?.map((result) => {
                return result.json();
            }),
        );
        res?.map((result) => {
            if (Object.keys(result).length === 0 && result.constructor === Object) return;
            const act = result?.find((user) => user.login === login);
            if (act?.note === 100) addActivite(Activities.EXPERIENCE, Activities.EXPERIENCE, Status.PRESENT, act?.date);
        });
    } catch (e) {
        console.log(e);
    }
};

const sortDate = (a, b) => {
    const [dateA, dateB] = [new Date(a.start), new Date(b.start)];

    return dateA - dateB;
};

const addActivite = (title, type, status, date) => {
    const act = xpAct.get(type);
    const {limitPart, xpWinPart, xpWinOrg, nbPart, xpLostPart, nbOrg, limitOrg} = act;

    switch (status) {
        case Status.PRESENT:
            nbPart < limitPart && (me.nbXps += xpWinPart) && (act.nbPart += 1);
            me.present.push({title, type, status, date});
            break;
        case Status.ABSENT:
            me.nbXps -= xpLostPart;
            me.absent.push({title, type, status, date});
            break;
        case Status.ORGANIZER:
            nbOrg < limitOrg && (me.nbXps += xpWinOrg) && (act.nbOrg += 1);
            me.present.push({title, type, status: Status.ORGANIZER, date});
            break;
        case Status.SOON:
            me.soon.push({title, type, status: Status.REGISTERED, date});
            break;
        case Status.NON_APPLICABLE:
            me[Status.NON_APPLICABLE].push({title, type, status: Status.NON_APPLICABLE, date})
            break;
        default:
            break;
    }
};

const countXpSoon = () => {
    me.soon.map((act) => {
        const actElement = xpAct.get(act.type)
        const {xpWinPart, limitPart, nbPart} = actElement;
        nbPart < limitPart && (me.nbXpsSoon += xpWinPart) && actElement.nbPart++;
    });
};

const getXp = async () => {
    const {login, location, scolaryear} = await getProfil();
    year = scolaryear;
    const activitiesPays = (await getActivitiesHub(location.split('/')[0]))?.activites;
    const activitiesRegion = (await getActivitiesHub(location.split('/')[1]))?.activites;
    const activities = activitiesPays.concat(activitiesRegion).sort(sortDate);
    const strRegex = Object.values(Activities).map((name, index) => {
        if (index + 1 !== xpAct.size) return name + '|';
        return name;
    });
    const regexExp = new RegExp(`^${strRegex.join('')}$`);

    activities.map((activite) => {
        const typeAct = regexExp.exec(activite?.type_title);

        if (typeAct)
            activite.events.map((event) => {
                if (event?.user_status)
                    addActivite(activite.title, typeAct[0], event.user_status, event.begin);
                else if (event?.assistants?.find((assistant) => assistant.login === login))
                    addActivite(activite.title, typeAct[0], Status.ORGANIZER, event.begin);
                else if (event?.already_register)
                    addActivite(activite.title, typeAct[0], Status.SOON, event.begin);
            });
    });

    await getAllExperiences(
        activities.filter((activite) => activite?.type_title === Activities.EXPERIENCE),
        location,
        login,
    );
    countXpSoon();
    console.log(xpAct)
    console.log(me)
    me.present.forEach(element => {
        if (element.type === 'Experience')
            participation.experience++;
        if (element.type === 'Talk')
            (element.status === Status.ORGANIZER ? organization : participation).talk++;
        if (element.type === 'Workshop')
            (element.status === Status.ORGANIZER ? organization : participation).workshop++;
        if (element.type === 'Hackathon')
            (element.status === Status.ORGANIZER ? organization : participation).hackathon++;
    });
    me.soon.forEach(element => {
        if (element.type === 'Talk')
            (element.status === Status.ORGANIZER ? organization : participation).talksoon++;
        if (element.type === 'Workshop')
            (element.status === Status.ORGANIZER ? organization : participation).workshopsoon++;
        if (element.type === 'Hackathon')
            (element.status === Status.ORGANIZER ? organization : participation).hackathonsoon++;
    });
    value.innerHTML = `
        Validated : ${me.nbXps} / In progress : ${me.nbXpsSoon} 
        <br> Experimentation: ${participation.experience} / ${xpAct.get(Activities.EXPERIENCE).limitPart}
        <br> Talk: ${participation.talk} (+${participation.talksoon}) / ${xpAct.get(Activities.TALK).limitPart} - Orga: ${organization.talk} (+${organization.talksoon}) / ${xpAct.get(Activities.TALK).limitOrg}
        <br> Workshop: ${participation.workshop} (+${participation.workshopsoon}) / ${xpAct.get(Activities.WORKSHOP).limitPart} - Orga: ${organization.workshop} (+${organization.workshopsoon}) / ${xpAct.get(Activities.WORKSHOP).limitOrg}
        <br> Hackathon: ${participation.hackathon} (+${participation.hackathonsoon}) - Orga: ${organization.hackathon} (+${organization.hackathonsoon})
    `;
};

const insertAfter = (newNode, referenceNode) => {
    if (referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }
};

const findElemByText = (tag, text, xpathType) => {
    return document.evaluate(`//${tag}[text()="${text}"]`, document, null, xpathType, null);
};

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

const lang = getCookie('language');

const neartag = findElemByText('label', 'G.P.A.', XPathResult.FIRST_ORDERED_NODE_TYPE)?.singleNodeValue;

const title = document.createElement('label');
title.innerHTML = 'HUB XP';
const value = document.createElement('span');
value.classList.add('value');
value.innerHTML = 'Loading...';
insertAfter(title, neartag.nextElementSibling);
insertAfter(value, title);

getXp();
