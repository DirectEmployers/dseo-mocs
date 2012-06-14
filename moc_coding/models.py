from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic
from django.db import models


class Onet(models.Model):
    """
    Each ``Onet`` instance represents a single O*NET Standard
    Occupational Classification ("O*NET-SOC") entity. For information
    about the O*NET-SOC system, consult:
    http://www.onetonline.org/help/onet/
    
    """
    def __unicode__(self):
        return self.title

    class Meta:
        verbose_name = "Onet"
        verbose_name_plural = "Onets"
        unique_together = ("title", "code")
        
    title = models.CharField(max_length=300)
    code = models.CharField(max_length=10, primary_key=True)
    

class Moc(models.Model):
    """
    Models the information about a single Military Occupational Code
    (MOC)[1] as defined by the US Department of Defense, and relates each
    MOC to a set of O*NET codes[2]. This allows us to have a searchable
    relationship between military and civilian jobs.
    
    """
    def __unicode__(self):
        SERVICE_CHOICES = {
            u'air-force':u'USAF',
            u'army':u'USA',
            u'coast-guard':u'USCG',
            u'marines':u'USMC',
            u'navy':u'USN'
        }
        # MOC titles can be extremely long, so we'll truncate them to a
        # reasonable length to display in the UI.
        return truncate("%s:%s - %s" % (SERVICE_CHOICES[self.branch],
                                        self.code,
                                        self.title), length=64)

    class Meta:
        verbose_name = "Military Occupational Code"
        verbose_name_plural = "Military Occupational Codes"
        unique_together = ("code", "branch")
        ordering = ['branch', 'code']

    code = models.CharField(max_length=20, db_index=True)
    branch = models.CharField(max_length=11)
    title = models.CharField(max_length=300)
    title_slug = models.SlugField(max_length=300)
    onets = models.ManyToManyField(Onet)
    moc_detail = models.OneToOneField('MocDetail', null=True)
    
    
class MocDetail(models.Model):
    # Needs to be evaluated for utility. This is a bit of legacy code that seems
    # superfluous. I can envision a UI-level data structure like this, but a
    # simple in-memory Python dictionary would do just as well. The only
    # difference between this model and the `Moc` model is the
    # `civilian_description` field.
    SERVICE_CHOICES = (
        (u'f',u'Air Force'),
        (u'a',u'Army'),
        (u'c',u'Coast Guard'),
        (u'm',u'Marines'),
        (u'n',u'Navy'),
    )
    
    primary_value = models.CharField(max_length=255)
    service_branch = models.CharField(max_length=2, choices=SERVICE_CHOICES)
    military_description = models.CharField(max_length=255)
    civilian_description = models.CharField(max_length=255, blank=True)
    

class CustomCareer(models.Model):
    """
    A table to keep track of custom MOC->Onet mappings. The intent is that
    external apps (external relative to 'moc_coding' app) will maintain
    an additional relation between the entity that wants a custom mapping
    and the entity itself.

    """
    
    def __repr__(self):
        return "<CustomCareer MOC:%s O*NET-SOC:%s>" % (self.moc.id or 0,
                                                       self.onet.code or 0)
    
    def __str__(self):
        return "MOC:%s:%s -> O*NET-SOC:%s" % (self.moc.id or 0,
                                              self.moc.branch,
                                              self.onet.code or 0)
    
    moc = models.ForeignKey(Moc, verbose_name="Military Occupational Code",
                            help_text="""Sorted by branch, then MOC, then MOC \
                            title.""")
    onet = models.ForeignKey(Onet, verbose_name="O*NET-SOC",
                             help_text="""Standard occupational classifications\
                              developed by the US Dept. of Labor.""")
    content_type = models.ForeignKey(ContentType)
    object_id = models.PositiveIntegerField()
    content_object = generic.GenericForeignKey()
        
    class Meta:
        verbose_name = "Custom Military/Civilian Career Map"
        verbose_name_plural = "Custom Military/Civilian Career Maps"
        

def truncate(content, length=32, suffix='...'):
    """
    Trims `content` to no more characters than `length`.

    Input:
    :content: String. An MOC or O*NET title.
    :length: Integer. `content` will be trimmed to this length.
    :suffix: String. This will be appended to the end of the trimmed
    `content` string to indicate that we're not displaying the whole
    value.

    Returns:
    `content` trimmed to, at most, the length of `length`+`suffix`.
    
    """
    if len(content) <= (length - len(suffix)):
        return content
    else:
        return content[:length]+suffix
