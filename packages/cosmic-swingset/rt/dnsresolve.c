// cribbed from https://gist.github.com/fffaraz/9d9170b57791c28ccda9255b48315168

//DNS Query Program on Linux
//Author : Silver Moon (m00n.silv3r@gmail.com)
//Dated : 29/4/2009
 
//Header Files
#include <assert.h>
#include <stdio.h> //printf
#include <string.h>    //strlen
#include <stdlib.h>    //malloc
#include <sys/socket.h>    //you know what this is for
#include <arpa/inet.h> //inet_addr , inet_ntoa , ntohs etc
#include <netinet/in.h>
#include <unistd.h>    //getpid
 
//Types of DNS resource records :)
 
#define T_A 1 //Ipv4 address
#define T_NS 2 //Nameserver
#define T_CNAME 5 // canonical name
#define T_SOA 6 /* start of authority zone */
#define T_PTR 12 /* domain name pointer */
#define T_MX 15 //Mail server
 
//Function Prototypes
void ngethostbyname (unsigned char* , int, char const ** const dns_servers, int);
static int lengthPrefixed(int, unsigned char*, unsigned const char*);
unsigned char* ReadName (unsigned char*,unsigned char*,int*);
static void get_dns_servers(char ** const dns_servers, int);
 
//DNS header structure
struct DNS_HEADER
{
  unsigned short id; // identification number
 
  unsigned char rd :1; // recursion desired
  unsigned char tc :1; // truncated message
  unsigned char aa :1; // authoritive answer
  unsigned char opcode :4; // purpose of message
  unsigned char qr :1; // query/response flag
 
  unsigned char rcode :4; // response code
  unsigned char cd :1; // checking disabled
  unsigned char ad :1; // authenticated data
  unsigned char z :1; // its z! reserved
  unsigned char ra :1; // recursion available
 
  unsigned short q_count; // number of question entries
  unsigned short ans_count; // number of answer entries
  unsigned short auth_count; // number of authority entries
  unsigned short add_count; // number of resource entries
};

struct REQUEST {
  struct DNS_HEADER header;
  unsigned char query[65536 - sizeof(struct DNS_HEADER)];
};

//Constant sized fields of query structure
struct QUESTION
{
  unsigned short qtype;
  unsigned short qclass;
};
 
//Constant sized fields of the resource record structure
#pragma pack(push, 1)
struct R_DATA
{
  unsigned short type;
  unsigned short _class;
  unsigned int ttl;
  unsigned short data_len;
};
#pragma pack(pop)
 
//Pointers to resource record contents
struct RES_RECORD
{
  unsigned char *name;
  struct R_DATA *resource;
  unsigned char *rdata;
};
 
//Structure of a Query
typedef struct
{
  unsigned char *name;
  struct QUESTION *ques;
} QUERY;


int main( int argc , char *argv[])
{
  //List of DNS Servers registered on the system
  char buf1[100], buf2[100];
  char *dns_servers[] = { buf1, buf2 };;

  //Get the DNS servers from the resolv.conf file
  get_dns_servers(dns_servers, 2);

  unsigned char hostname[100];
  strcpy(hostname , "ip4.me");
 
  //Now get the ip of this hostname , A record
  ngethostbyname(hostname, T_A, (const char ** const) dns_servers, getpid());
 
  return 0;
}

/*
 * Perform a DNS query by sending a packet
 * */
void ngethostbyname(unsigned char *host , int query_type, char const ** const dns_servers, int id)
{
  struct REQUEST buf;
  int i, j, stop, s;
 
  struct sockaddr_in a;
 
  struct RES_RECORD answers[20], auth[20], addit[20]; //the replies from the DNS server
  struct sockaddr_in dest;
 
  printf("Resolving %s" , host);
 
  s = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP); //UDP packet for DNS queries //AMBIENT
 
  dest.sin_family = AF_INET;
  dest.sin_port = htons(53);
  // @@inet_addr is deprecated in favor of inet_aton. CHECK RETURN!
  dest.sin_addr.s_addr = inet_addr(dns_servers[0]); //dns servers
 
  //Set the DNS structure to standard queries
  struct DNS_HEADER *dns = &buf.header;
 
  dns->id = (unsigned short) htons(id);
  dns->qr = 0; //This is a query
  dns->opcode = 0; //This is a standard query
  dns->aa = 0; //Not Authoritative
  dns->tc = 0; //This message is not truncated
  dns->rd = 1; //Recursion Desired
  dns->ra = 0; //Recursion not available! hey we dont have it (lol)
  dns->z = 0;
  dns->ad = 0;
  dns->cd = 0;
  dns->rcode = 0;
  dns->q_count = htons(1); //we have only 1 question
  dns->ans_count = 0;
  dns->auth_count = 0;
  dns->add_count = 0;
 
  //point to the query portion
  unsigned char *qname = &buf.query[0];
 
  int namelen = lengthPrefixed(sizeof(buf.query), qname, host);

  struct QUESTION *qinfo = (struct QUESTION*)&buf.query[namelen]; //fill it
  qinfo->qtype = htons(query_type); //type of the query , A , MX , CNAME , NS etc
  qinfo->qclass = htons(1); // its internet (lol)
 
  printf("\nSending Packet...");
  int packetlen = sizeof(buf.header) + namelen + sizeof(*qinfo);
  if (sendto(s, (char*)&buf, packetlen, 0, (const struct sockaddr*)&dest, sizeof(dest)) < 0)
  {
    perror("sendto failed");
    return;
  }
  printf("Done");
     
  //Receive the answer
  i = sizeof dest;
  printf("\nReceiving answer...");
  if(recvfrom(s, (char*)&buf , sizeof(buf), 0, (struct sockaddr*)&dest , (socklen_t*)&i) < 0) {
    perror("recvfrom failed");
    return;
  }
  printf("Done");
 
  dns = &buf.header;
 
  //move ahead of the dns header and the query field
  unsigned char *reader = ((unsigned char*)&buf) + packetlen;
 
  printf("\nThe response contains : ");
  printf("\n %d Questions.", ntohs(dns->q_count));
  printf("\n %d Answers.", ntohs(dns->ans_count));
  printf("\n %d Authoritative Servers.", ntohs(dns->auth_count));
  printf("\n %d Additional records.\n\n", ntohs(dns->add_count));
 
  //Start reading answers
  stop=0;
 
  for(i = 0; i<ntohs(dns->ans_count); i++) {
    answers[i].name = ReadName(reader, (unsigned char*)&buf, &stop);
    reader = reader + stop;
 
    answers[i].resource = (struct R_DATA*)(reader);
    reader = reader + sizeof(struct R_DATA);
 
    if(ntohs(answers[i].resource->type) == 1) { //if its an ipv4 address
      answers[i].rdata = (unsigned char*)malloc(ntohs(answers[i].resource->data_len));
 
      for(j=0 ; j < ntohs(answers[i].resource->data_len); j++) {
        answers[i].rdata[j]=reader[j];
      }
 
      answers[i].rdata[ntohs(answers[i].resource->data_len)] = '\0';
 
      reader = reader + ntohs(answers[i].resource->data_len);
    }
    else
    {
      answers[i].rdata = ReadName(reader, (unsigned char*)&buf, &stop);
      reader = reader + stop;
    }
  }
 
  // read authorities
  for(i=0; i < ntohs(dns->auth_count); i++) {
    auth[i].name = ReadName(reader, (unsigned char*)&buf, &stop);
    reader += stop;
 
    auth[i].resource = (struct R_DATA*)(reader);
    reader += sizeof(struct R_DATA);
 
    auth[i].rdata = ReadName(reader, (unsigned char*)&buf, &stop);
    reader += stop;
  }
 
  //read additional
  for(i=0; i < ntohs(dns->add_count); i++) {
    addit[i].name = ReadName(reader, (unsigned char*)&buf, &stop);
    reader += stop;
 
    addit[i].resource = (struct R_DATA*)(reader);
    reader += sizeof(struct R_DATA);
 
    if(ntohs(addit[i].resource->type) == 1) {
      addit[i].rdata = (unsigned char*)malloc(ntohs(addit[i].resource->data_len));
      for(j=0; j < ntohs(addit[i].resource->data_len); j++)
        addit[i].rdata[j] = reader[j];
 
      addit[i].rdata[ntohs(addit[i].resource->data_len)] = '\0';
      reader += ntohs(addit[i].resource->data_len);
    } else {
      addit[i].rdata = ReadName(reader, (unsigned char*)&buf, &stop);
      reader += stop;
    }
  }
 
  //print answers
  printf("\nAnswer Records : %d \n" , ntohs(dns->ans_count) );
  for(i=0 ; i < ntohs(dns->ans_count) ; i++) {
    printf("Name : %s ",answers[i].name);
 
    if( ntohs(answers[i].resource->type) == T_A) { //IPv4 address
      long *p;
      p=(long*)answers[i].rdata;
      a.sin_addr.s_addr=(*p); //working without ntohl
      printf("has IPv4 address : %s",inet_ntoa(a.sin_addr));
    }
         
    if(ntohs(answers[i].resource->type)==5) {
      //Canonical name for an alias
      printf("has alias name : %s",answers[i].rdata);
    }
 
    printf("\n");
  }
 
  //print authorities
  printf("\nAuthoritive Records : %d \n" , ntohs(dns->auth_count) );
  for( i=0 ; i < ntohs(dns->auth_count) ; i++) {
         
    printf("Name : %s ",auth[i].name);
    if(ntohs(auth[i].resource->type)==2)
    {
      printf("has nameserver : %s",auth[i].rdata);
    }
    printf("\n");
  }
 
  //print additional resource records
  printf("\nAdditional Records : %d \n" , ntohs(dns->add_count) );
  for(i=0; i < ntohs(dns->add_count) ; i++) {
    printf("Name : %s ",addit[i].name);
    if(ntohs(addit[i].resource->type)==1)
    {
      long *p;
      p=(long*)addit[i].rdata;
      a.sin_addr.s_addr=(*p);
      printf("has IPv4 address : %s",inet_ntoa(a.sin_addr));
    }
    printf("\n");
  }
  return;
}
 
/*
 * 
 * */
u_char* ReadName(unsigned char* reader, unsigned char* buffer, int* count)
{
  unsigned char *name;
  unsigned int p=0, jumped=0, offset;
  int i , j;
 
  *count = 1;
  name = (unsigned char*)malloc(256);
 
  name[0]='\0';
 
  //read the names in 3www6google3com format
  while(*reader != '\0') {
    if(*reader >= 192) {
      offset = (*reader)*256 + *(reader+1) - 49152; // 49152 = 11000000 00000000 ;)
      reader = buffer + offset - 1;
      jumped = 1; //we have jumped to another location so counting won't go up!
    } else {
      name[p++] = *reader;
    }
 
    reader = reader + 1;
 
    if(jumped == 0) {
      *count = *count + 1; // If we haven't jumped to another location then we can count up.
    }
  }
 
  name[p] = '\0'; //string complete
  if(jumped == 1) {
    *count = *count + 1; //number of steps we actually moved forward in the packet
  }
 
  //now convert 3www6google3com0 to www.google.com
  for(i=0; i < (int)strlen((const char*)name); i++) 
  {
    p = name[i];
    for(j=0; j < (int)p; j++) 
    {
      name[i] = name[i+1];
      i = i+1;
    }
    name[i] = '.';
  }
  name[i-1] = '\0'; // remove the last dot
  return name;
}
 
/*
 * Get the DNS servers from /etc/resolv.conf file on Linux
 * */
void get_dns_servers(char ** const dns_servers, int qty)
{
  if (qty >= 1)
    strcpy(dns_servers[0] , "208.67.222.222");
  if (qty >= 2)
    strcpy(dns_servers[1] , "208.67.220.220");
}
 
/*
 * This will convert www.google.com to 3www6google3com 
 * got it :)
 * */
static int lengthPrefixed(int dest_size, unsigned char* dest, unsigned const char* dotted) 
{
  unsigned const char *save = dest;
  unsigned const char *start = dotted;

  printf("\n@@%s -> ", dotted);
  assert(dest_size > 0);
  while(dest - save < dest_size) {
    unsigned char ch = *dotted;
    if (ch == '.' || ch == '\0') {
      *dest++ = dotted - start;
      while (start < dotted) {
        *dest++ = *start++;
      }
      if (ch == '\0') {
        break;
      }
      start++;
    }
    dotted++;
  }
  *dest++ = '\0';
  printf("%d: %s\n", (int)(dest - save), save); 
  return dest - save;
}
